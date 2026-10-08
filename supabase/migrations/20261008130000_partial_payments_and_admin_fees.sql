-- Partial payments (a fee can now be paid in installments) and the ledger
-- that gives each installment its own history entry, the same idea
-- wallet_transactions already gives the wallet alongside wallets.balance.
--
-- payments.amount stays the fee's total; amount_paid tracks how much of it
-- has been paid so far. status still means what it always has: 'pending'
-- until amount_paid reaches amount, then 'paid' (a partially-paid fee is
-- simply status = 'pending' with amount_paid > 0).
--
-- Safe to run before the new app code is deployed: pay_fee_with_wallet (the
-- function the deployed site calls) is kept and updated, not dropped. Run the
-- whole file as one block in the Supabase SQL Editor.

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

CREATE INDEX payment_transactions_payment_id_idx ON public.payment_transactions (payment_id);

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

-- A cashier records only cash, and only as themselves.
CREATE POLICY cashiers_insert_cash_transactions ON public.payment_transactions FOR INSERT
  WITH CHECK (public.auth_role() = 'cashier' AND payment_method = 'cash' AND recorded_by = auth.uid());

-- Backfill: every already-paid fee gets one ledger row (so no payment history
-- is lost) and amount_paid = amount. Written to be re-runnable: it skips fees
-- that already have a ledger row, so running it again after the new code is
-- deployed catches anything the old code recorded in between.
INSERT INTO public.payment_transactions (payment_id, amount, payment_method, recorded_by, transaction_date, receipt_ref)
SELECT p.id, p.amount, COALESCE(p.payment_method, 'cash'), p.recorded_by, COALESCE(p.transaction_date, p.created_at), p.receipt_ref
FROM public.payments p
WHERE p.status = 'paid' AND p.amount > 0
  AND NOT EXISTS (SELECT 1 FROM public.payment_transactions t WHERE t.payment_id = p.id);

UPDATE public.payments SET amount_paid = amount WHERE status = 'paid' AND amount_paid <> amount;

-- The deployed site's "Pay with Wallet" (one fee, in full) keeps working, now
-- paying what is left on the fee and writing the ledger row too. The new code
-- uses pay_amount_with_wallet below instead; this can be dropped later.
CREATE OR REPLACE FUNCTION public.pay_fee_with_wallet(p_payment_id uuid) RETURNS public.payments
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  v_payment public.payments;
  v_caller uuid := auth.uid();
  v_owns boolean;
  v_due numeric;
begin
  if v_caller is null then raise exception 'NOT_AUTHENTICATED'; end if;

  select * into v_payment from public.payments where id = p_payment_id for update;
  if v_payment.id is null then raise exception 'PAYMENT_NOT_FOUND'; end if;
  if v_payment.status <> 'pending' then raise exception 'PAYMENT_NOT_PENDING'; end if;

  select exists (
    select 1 from public.parent_student ps
    where ps.student_id = v_payment.student_id and ps.parent_id = v_caller
  ) into v_owns;
  if not v_owns then raise exception 'NOT_AUTHORIZED'; end if;

  v_due := v_payment.amount - v_payment.amount_paid;

  update public.wallets
    set balance = balance - v_due, updated_at = now()
    where parent_id = v_caller and balance >= v_due;
  if not found then raise exception 'INSUFFICIENT_BALANCE'; end if;

  update public.payments
    set status = 'paid', amount_paid = amount, payment_method = 'wallet', transaction_date = now(), recorded_by = v_caller
    where id = p_payment_id
    returning * into v_payment;

  if v_due > 0 then
    insert into public.payment_transactions (payment_id, amount, payment_method, recorded_by)
      values (p_payment_id, v_due, 'wallet', v_caller);
  end if;

  return v_payment;
end;
$$;

-- Pays a chosen amount across a student's outstanding fees, in due-date
-- order, partially settling whichever fee the amount runs out on. Returns the
-- ids of every payment_transactions row it inserted, so the caller can email
-- a receipt for each.
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
  if p_amount is null or p_amount <= 0 or p_amount <> round(p_amount, 2) then raise exception 'INVALID_AMOUNT'; end if;

  select exists (
    select 1 from public.parent_student ps
    where ps.student_id = p_student_id and ps.parent_id = v_caller
  ) into v_owns;
  if not v_owns then raise exception 'NOT_AUTHORIZED'; end if;

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

-- reverse_payment refunds the sum of a fee's wallet transactions (it may have
-- been paid in a mix of installments and methods) and resets amount_paid to 0.
-- It now also reverses a partly paid fee (still 'pending', amount_paid > 0).
-- The fee's payment_transactions rows stay as history; payment_adjustments
-- records the reversal.
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
      jsonb_build_object('status', v_before_status, 'amount_paid', v_before_paid),
      jsonb_build_object('status', 'pending', 'amount_paid', 0), auth.uid());
  return v_payment;
end;
$$;

-- A cashier may now record partial cash payments: amount_paid may only go up,
-- never past the fee, and the fee becomes 'paid' exactly when it is fully
-- paid. Everything else about the fee stays locked for them, as before.
CREATE OR REPLACE FUNCTION public.enforce_cashier_payment_update() RETURNS trigger
  LANGUAGE plpgsql
AS $$
begin
  if public.auth_role() = 'cashier' then
    if old.status is distinct from 'pending' then
      raise exception 'A cashier may only record a payment on an unpaid fee.';
    end if;
    if new.amount_paid <= old.amount_paid then
      raise exception 'A cashier may only record a payment.';
    end if;
    if new.status is distinct from (case when new.amount_paid >= new.amount then 'paid' else 'pending' end)::public.payment_status then
      raise exception 'A fee is paid exactly when it is paid in full.';
    end if;
    if new.payment_method is distinct from 'cash' then
      raise exception 'A cashier may only record cash payments.';
    end if;
    if (to_jsonb(new) - array['status', 'amount_paid', 'payment_method', 'transaction_date', 'recorded_by', 'description'])
       is distinct from
       (to_jsonb(old) - array['status', 'amount_paid', 'payment_method', 'transaction_date', 'recorded_by', 'description']) then
      raise exception 'A cashier may not change the fee itself.';
    end if;
  end if;
  return new;
end;
$$;

-- A cash payment a cashier records ad hoc is inserted already paid in full.
DROP POLICY cashiers_record_cash_payments ON public.payments;
CREATE POLICY cashiers_record_cash_payments ON public.payments
  FOR INSERT TO public
  WITH CHECK (public.auth_role() = 'cashier' AND status = 'paid' AND payment_method = 'cash' AND amount_paid = amount);
