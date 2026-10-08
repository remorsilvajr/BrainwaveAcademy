-- A super admin can delete a fee that has nothing paid toward it. The fee is
-- not lost: it moves, with its correction history and any reversed payment
-- rows, into deleted_payments, which only a super admin can see (Deleted
-- Items), and can be restored exactly as it was. All of it happens inside
-- these functions so a fee is never half moved, and each one checks for a
-- super admin itself (a direct API call can't skip the app's check).

CREATE TABLE public.deleted_payments (
    id uuid PRIMARY KEY,
    student_id uuid NOT NULL,
    description text,
    fee_type text,
    amount numeric(10,2) NOT NULL,
    payment jsonb NOT NULL,
    transactions jsonb NOT NULL DEFAULT '[]'::jsonb,
    adjustments jsonb NOT NULL DEFAULT '[]'::jsonb,
    reason text NOT NULL,
    deleted_by uuid REFERENCES public.profiles(id),
    deleted_at timestamp with time zone DEFAULT now() NOT NULL
);

-- No policies: only the functions below (and the service role) touch it.
ALTER TABLE public.deleted_payments ENABLE ROW LEVEL SECURITY;

CREATE FUNCTION public.is_super_admin_caller() RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin' and is_super_admin and deleted_at is null
  );
$$;

CREATE FUNCTION public.delete_fee(p_payment_id uuid, p_reason text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  v_payment public.payments;
begin
  if not public.is_super_admin_caller() then raise exception 'NOT_SUPER_ADMIN'; end if;
  if p_reason is null or char_length(btrim(p_reason)) < 5 or char_length(btrim(p_reason)) > 500 then
    raise exception 'REASON_REQUIRED';
  end if;
  select * into v_payment from public.payments where id = p_payment_id for update;
  if v_payment.id is null then raise exception 'PAYMENT_NOT_FOUND'; end if;
  if v_payment.amount_paid > 0 then raise exception 'HAS_PAYMENTS'; end if;

  insert into public.deleted_payments (id, student_id, description, fee_type, amount, payment, transactions, adjustments, reason, deleted_by)
  values (
    v_payment.id, v_payment.student_id, v_payment.description, v_payment.fee_type, v_payment.amount,
    to_jsonb(v_payment),
    coalesce((select jsonb_agg(to_jsonb(t)) from public.payment_transactions t where t.payment_id = p_payment_id), '[]'::jsonb),
    coalesce((select jsonb_agg(to_jsonb(a)) from public.payment_adjustments a where a.payment_id = p_payment_id), '[]'::jsonb),
    btrim(p_reason),
    auth.uid()
  );

  delete from public.payment_transactions where payment_id = p_payment_id;
  delete from public.payment_adjustments where payment_id = p_payment_id;
  delete from public.payments where id = p_payment_id;
end;
$$;

CREATE FUNCTION public.restore_fee(p_payment_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  v_row public.deleted_payments;
begin
  if not public.is_super_admin_caller() then raise exception 'NOT_SUPER_ADMIN'; end if;
  select * into v_row from public.deleted_payments where id = p_payment_id for update;
  if v_row.id is null then raise exception 'NOT_FOUND'; end if;
  if not exists (select 1 from public.students where id = v_row.student_id) then raise exception 'STUDENT_GONE'; end if;

  insert into public.payments select * from jsonb_populate_record(null::public.payments, v_row.payment);
  insert into public.payment_transactions select * from jsonb_populate_recordset(null::public.payment_transactions, v_row.transactions);
  insert into public.payment_adjustments select * from jsonb_populate_recordset(null::public.payment_adjustments, v_row.adjustments);
  delete from public.deleted_payments where id = p_payment_id;
end;
$$;

REVOKE EXECUTE ON FUNCTION public.delete_fee(uuid, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.restore_fee(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_super_admin_caller() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_fee(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.restore_fee(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_super_admin_caller() TO authenticated;
