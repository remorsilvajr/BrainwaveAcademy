-- Online payments (sandbox for now) replace paying from the wallet. The
-- checkout runs in the app's server: it validates the (test) card or GCash
-- number, then calls pay_amount_online with the service role. Parents can't
-- call this function themselves (EXECUTE is revoked), so a fee can only be
-- marked paid online after the server-side checkout accepted the payment.

ALTER TABLE public.payments DROP CONSTRAINT payments_payment_method_check;
ALTER TABLE public.payments ADD CONSTRAINT payments_payment_method_check
  CHECK (payment_method IS NULL OR payment_method = ANY (ARRAY['wallet'::text, 'cash'::text, 'check'::text, 'card'::text, 'gcash'::text]));

ALTER TABLE public.payment_transactions DROP CONSTRAINT payment_transactions_method_check;
ALTER TABLE public.payment_transactions ADD CONSTRAINT payment_transactions_method_check
  CHECK (payment_method = ANY (ARRAY['wallet'::text, 'cash'::text, 'check'::text, 'card'::text, 'gcash'::text]));

-- Same allocation as pay_amount_with_wallet (soonest due first, the last fee
-- possibly only partly paid), without a wallet. p_note holds what may be kept
-- about the payment (e.g. "Visa ending 1111"), never a full card number.
CREATE FUNCTION public.pay_amount_online(p_parent_id uuid, p_student_id uuid, p_amount numeric, p_method text, p_note text) RETURNS uuid[]
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  v_total_outstanding numeric := 0;
  v_remaining numeric;
  v_fee record;
  v_pay numeric;
  v_new_status public.payment_status;
  v_tx_id uuid;
  v_tx_ids uuid[] := '{}';
begin
  if p_method is null or p_method not in ('card', 'gcash') then raise exception 'INVALID_METHOD'; end if;
  if p_amount is null or p_amount <= 0 or p_amount <> round(p_amount, 2) then raise exception 'INVALID_AMOUNT'; end if;
  if not exists (
    select 1 from public.parent_student ps where ps.student_id = p_student_id and ps.parent_id = p_parent_id
  ) then raise exception 'NOT_AUTHORIZED'; end if;

  for v_fee in
    select amount, amount_paid from public.payments
    where student_id = p_student_id and status = 'pending'
    for update
  loop
    v_total_outstanding := v_total_outstanding + (v_fee.amount - v_fee.amount_paid);
  end loop;
  if p_amount > v_total_outstanding then raise exception 'AMOUNT_EXCEEDS_OUTSTANDING'; end if;

   v_remaining := p_amount;
  for v_fee in
    select id, amount, amount_paid from public.payments
    where student_id = p_student_id and status = 'pending'
    order by due_date asc nulls last, created_at asc
    for update
  loop
    exit when v_remaining <= 0;
    v_pay := least(v_fee.amount - v_fee.amount_paid, v_remaining);
    if v_pay <= 0 then continue; end if;
    v_new_status := case when v_fee.amount_paid + v_pay >= v_fee.amount then 'paid' else 'pending' end;

    update public.payments
      set amount_paid = amount_paid + v_pay, status = v_new_status, transaction_date = now(),
          payment_method = p_method, recorded_by = p_parent_id
      where id = v_fee.id;

    insert into public.payment_transactions (payment_id, amount, payment_method, recorded_by, note)
      values (v_fee.id, v_pay, p_method, p_parent_id, p_note)
      returning id into v_tx_id;
    v_tx_ids := array_append(v_tx_ids, v_tx_id);
    v_remaining := v_remaining - v_pay;
  end loop;

  return v_tx_ids;
end;
$$;

REVOKE EXECUTE ON FUNCTION public.pay_amount_online(uuid, uuid, numeric, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.pay_amount_online(uuid, uuid, numeric, text, text) TO service_role;
