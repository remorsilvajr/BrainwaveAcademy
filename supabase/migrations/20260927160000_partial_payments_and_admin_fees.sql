-- Partial payments (a fee can now be paid in installments) and the ledger
-- that gives each installment its own history entry, the same idea
-- wallet_transactions already gives the wallet alongside wallets.balance.
--
-- payments.amount stays the fee's total; amount_paid tracks how much of it
-- has been paid so far. status still means what it always has: 'pending'
-- until amount_paid reaches amount, then 'paid' — a partially-paid fee is
-- simply status = 'pending' with amount_paid > 0.
--
-- Run this whole file as one block in the Supabase SQL Editor.

ALTER TABLE public.payments
  ADD COLUMN amount_paid numeric(10,2) NOT NULL DEFAULT 0;

ALTER TABLE public.payments
  ADD CONSTRAINT payments_amount_paid_check CHECK (amount_paid >= 0 AND amount_paid <= amount);

-- The ledger: one row per actual payment event, whether it fully or
-- partially settles a fee.
CREATE TABLE public.payment_transactions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    payment_id uuid NOT NULL REFERENCES public.payments(id),
    amount numeric(10,2) NOT NULL,
    payment_method text NOT NULL,
    recorded_by uuid REFERENCES public.profiles(id),
    transaction_date timestamp with time zone DEFAULT now() NOT NULL,
    receipt_ref text,
    note text,
    CONSTRAINT payment_transactions_amount_check CHECK (amount > 0),
    CONSTRAINT payment_transactions_method_check CHECK (payment_method = ANY (ARRAY['wallet'::text, 'cash'::text, 'check'::text]))
);

-- Same SECURITY DEFINER + ref_counters pattern already used for
-- account_id/application_ref/payments.receipt_ref.
CREATE FUNCTION public.generate_transaction_receipt_ref() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  v_year text := to_char(now(), 'YYYY');
  v_seq bigint;
begin
  if new.receipt_ref is not null then
    return new;
  end if;
  insert into public.ref_counters (key, value)
    values ('transaction_receipt_ref_' || v_year, 1)
    on conflict (key) do update set value = public.ref_counters.value + 1
    returning value into v_seq;
  new.receipt_ref := 'RCT-' || v_year || '-T' || lpad(v_seq::text, 4, '0');
  return new;
end;
$$;

CREATE TRIGGER trg_generate_transaction_receipt_ref
  BEFORE INSERT ON public.payment_transactions
  FOR EACH ROW EXECUTE FUNCTION public.generate_transaction_receipt_ref();

ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY parents_view_child_transactions ON public.payment_transactions FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.payments p
    JOIN public.parent_student ps ON ps.student_id = p.student_id
    WHERE p.id = payment_transactions.payment_id AND ps.parent_id = auth.uid()
  ));

CREATE POLICY admins_manage_transactions ON public.payment_transactions FOR ALL
  USING (public.auth_role() = 'admin');

CREATE POLICY cashiers_view_transactions ON public.payment_transactions FOR SELECT
  USING (public.auth_role() = 'cashier');

CREATE POLICY cashiers_insert_cash_transactions ON public.payment_transactions FOR INSERT
  WITH CHECK (public.auth_role() = 'cashier' AND payment_method = 'cash');

-- Backfill: every already-paid fee gets one corresponding ledger row (so no
-- payment history is lost), and its amount_paid is set to its full amount.
INSERT INTO public.payment_transactions (payment_id, amount, payment_method, recorded_by, transaction_date, receipt_ref)
SELECT id, amount, COALESCE(payment_method, 'cash'), recorded_by, COALESCE(transaction_date, created_at), receipt_ref
FROM public.payments
WHERE status = 'paid';

UPDATE public.payments SET amount_paid = amount WHERE status = 'paid';

-- Replaces pay_fee_with_wallet (paid exactly one fee, fully, per call) with a
-- version that pays a chosen amount across a student's outstanding fees, in
-- due-date order, partially settling whichever fee the amount runs out on.
-- Returns the ids of every payment_transactions row it inserted, so the
-- caller can email a receipt for each.
DROP FUNCTION IF EXISTS public.pay_fee_with_wallet(uuid);

CREATE FUNCTION public.pay_amount_with_wallet(p_student_id uuid, p_amount numeric) RETURNS uuid[]
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  v_caller uuid := auth.uid();
  v_owns boolean;
  v_total_outstanding numeric := 0;
  v_remaining numeric;
  v_fee record;
  v_pay numeric;
  v_new_status public.payment_status;
  v_tx_id uuid;
  v_tx_ids uuid[] := '{}';
begin
  if v_caller is null then raise exception 'NOT_AUTHENTICATED'; end if;
  if p_amount is null or p_amount <= 0 then raise exception 'INVALID_AMOUNT'; end if;

  select exists (
    select 1 from public.parent_student ps
    where ps.student_id = p_student_id and ps.parent_id = v_caller
  ) into v_owns;
  if not v_owns then raise exception 'NOT_AUTHORIZED'; end if;

  -- Lock every outstanding fee for this student up front (order doesn't
  -- matter for this first pass, just the totalling and the lock).
  for v_fee in
    select amount, amount_paid from public.payments
    where student_id = p_student_id and status = 'pending'
    for update
  loop
    v_total_outstanding := v_total_outstanding + (v_fee.amount - v_fee.amount_paid);
  end loop;

  if p_amount > v_total_outstanding then raise exception 'AMOUNT_EXCEEDS_OUTSTANDING'; end if;

  update public.wallets
    set balance = balance - p_amount, updated_at = now()
    where parent_id = v_caller and balance >= p_amount;
  if not found then raise exception 'INSUFFICIENT_BALANCE'; end if;

  -- Second pass, in the order the parent portal already displays fees in
  -- (soonest due first): allocate the amount across them.
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
      set amount_paid = amount_paid + v_pay,
          status = v_new_status,
          transaction_date = now(),
          payment_method = 'wallet',
          recorded_by = v_caller
      where id = v_fee.id;

    insert into public.payment_transactions (payment_id, amount, payment_method, recorded_by)
      values (v_fee.id, v_pay, 'wallet', v_caller)
      returning id into v_tx_id;
    v_tx_ids := array_append(v_tx_ids, v_tx_id);

    v_remaining := v_remaining - v_pay;
  end loop;

  return v_tx_ids;
end;
$$;

-- reverse_payment now refunds the sum of a fee's wallet-method transactions
-- (it may have been paid in a mix of installments/methods) rather than
-- assuming the whole fee was one wallet payment, and resets amount_paid to 0.
-- Existing payment_transactions rows for the fee are left in place as history
-- (payment_adjustments already records that the fee was reversed).
CREATE OR REPLACE FUNCTION public.reverse_payment(p_payment_id uuid, p_reason text) RETURNS public.payments
    LANGUAGE plpgsql
    AS $$
declare
  v_payment public.payments;
  v_wallet_total numeric;
  v_parent uuid;
  v_count int;
  v_new numeric;
begin
  if auth_role() is distinct from 'admin' then raise exception 'NOT_ADMIN'; end if;
  if p_reason is null or char_length(btrim(p_reason)) < 5 then raise exception 'REASON_REQUIRED'; end if;
  select * into v_payment from public.payments where id = p_payment_id for update;
  if v_payment.id is null then raise exception 'PAYMENT_NOT_FOUND'; end if;
  if v_payment.status <> 'paid' then raise exception 'PAYMENT_NOT_PAID'; end if;

  select coalesce(sum(amount), 0) into v_wallet_total
    from public.payment_transactions where payment_id = p_payment_id and payment_method = 'wallet';

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

  update public.payments
    set status = 'pending', amount_paid = 0, payment_method = null, transaction_date = null, recorded_by = null
    where id = p_payment_id returning * into v_payment;
  insert into public.payment_adjustments (payment_id, action, reason, before, after, created_by)
    values (p_payment_id, 'reversed', btrim(p_reason),
      jsonb_build_object('status','paid'), jsonb_build_object('status','pending'), auth.uid());
  return v_payment;
end;
$$;
