-- A reversed payment's history rows stay (they are a record of what
-- happened) but are marked, so totals, the parent's Payment History and a
-- later reversal of the same fee ignore them. Without this, money already
-- refunded would still count as collected, and reversing a fee a second
-- time (after new installments) would refund the old installments again.

ALTER TABLE public.payment_transactions ADD COLUMN reversed_at timestamp with time zone;

CREATE OR REPLACE FUNCTION public.reverse_payment(p_payment_id uuid, p_reason text) RETURNS public.payments
    LANGUAGE plpgsql
    AS $$
declare
  v_payment public.payments;
  v_before_status public.payment_status;
  v_before_paid numeric;
  v_wallet_total numeric;
  v_parent uuid;
  v_count int;
  v_new numeric;
begin
  if auth_role() is distinct from 'admin' then raise exception 'NOT_ADMIN'; end if;
  if p_reason is null or char_length(btrim(p_reason)) < 5 then raise exception 'REASON_REQUIRED'; end if;
  select * into v_payment from public.payments where id = p_payment_id for update;
  if v_payment.id is null then raise exception 'PAYMENT_NOT_FOUND'; end if;
  if not (v_payment.status = 'paid' or (v_payment.status = 'pending' and v_payment.amount_paid > 0)) then
    raise exception 'PAYMENT_NOT_PAID';
  end if;
  v_before_status := v_payment.status;
  v_before_paid := v_payment.amount_paid;

  select coalesce(sum(amount), 0) into v_wallet_total
    from public.payment_transactions
    where payment_id = p_payment_id and payment_method = 'wallet' and reversed_at is null;

  if v_wallet_total > 0 then
    select ps.parent_id into v_parent from public.parent_student ps
      where ps.student_id = v_payment.student_id and ps.parent_id = v_payment.recorded_by limit 1;
    if v_parent is null then
      select count(*) into v_count from public.parent_student where student_id = v_payment.student_id;
      if v_count = 1 then
        select parent_id into v_parent from public.parent_student where student_id = v_payment.student_id;
      else
        raise exception 'PAYER_UNKNOWN';
      end if;
    end if;
    update public.wallets set balance = balance + v_wallet_total, updated_at = now()
      where parent_id = v_parent returning balance into v_new;
    if v_new is null then raise exception 'WALLET_NOT_FOUND'; end if;
    insert into public.wallet_transactions (parent_id, amount, balance_after, note, created_by)
      values (v_parent, v_wallet_total, v_new,
        'Refund: payment reversed (' || coalesce(v_payment.receipt_ref, 'no receipt') || '): ' || btrim(p_reason),
        auth.uid());
  end if;

  update public.payment_transactions set reversed_at = now()
    where payment_id = p_payment_id and reversed_at is null;

  update public.payments
    set status = 'pending', amount_paid = 0, payment_method = null, transaction_date = null, recorded_by = null
    where id = p_payment_id returning * into v_payment;
  insert into public.payment_adjustments (payment_id, action, reason, before, after, created_by)
    values (p_payment_id, 'reversed', btrim(p_reason),
      jsonb_build_object('status', v_before_status, 'amount_paid', v_before_paid),
      jsonb_build_object('status', 'pending', 'amount_paid', 0), auth.uid());
  return v_payment;
end;
$$;
