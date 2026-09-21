-- RLS restricts rows, not columns, so a cashier who called the API directly could rewrite
-- any column of the rows the policies above let them touch. These triggers narrow a
-- cashier to exactly what the cash desk does. They only act when the caller is a cashier
-- (auth_role() is null for the service role and 'admin' for admins, both untouched).

create or replace function public.enforce_cashier_payment_update() returns trigger
  language plpgsql
as $$
begin
  if public.auth_role() = 'cashier' then
    if old.status is distinct from 'pending' or new.status is distinct from 'paid' then
      raise exception 'A cashier may only mark an unpaid fee as paid.';
    end if;
    if new.payment_method is distinct from 'cash' then
      raise exception 'A cashier may only record cash payments.';
    end if;
    if (to_jsonb(new) - array['status', 'payment_method', 'transaction_date', 'recorded_by', 'description'])
       is distinct from
       (to_jsonb(old) - array['status', 'payment_method', 'transaction_date', 'recorded_by', 'description']) then
      raise exception 'A cashier may not change the fee itself.';
    end if;
  end if;
  return new;
end;
$$;

create trigger trg_enforce_cashier_payment_update
  before update on public.payments
  for each row execute function public.enforce_cashier_payment_update();

create or replace function public.enforce_cashier_wallet_request_update() returns trigger
  language plpgsql
as $$
begin
  if public.auth_role() = 'cashier' then
    if old.status is distinct from 'pending' or new.status not in ('approved', 'denied') then
      raise exception 'A cashier may only decide a pending request.';
    end if;
    if new.reviewed_by is distinct from auth.uid() then
      raise exception 'The reviewer must be the person deciding.';
    end if;
    if (to_jsonb(new) - array['status', 'approved_amount', 'review_note', 'reviewed_by', 'reviewed_at'])
       is distinct from
       (to_jsonb(old) - array['status', 'approved_amount', 'review_note', 'reviewed_by', 'reviewed_at']) then
      raise exception 'A cashier may only record the decision.';
    end if;
  end if;
  return new;
end;
$$;

create trigger trg_enforce_cashier_wallet_request_update
  before update on public.wallet_requests
  for each row execute function public.enforce_cashier_wallet_request_update();

create or replace function public.enforce_cashier_wallet_update() returns trigger
  language plpgsql
as $$
begin
  if public.auth_role() = 'cashier' then
    if (to_jsonb(new) - array['balance', 'updated_at']) is distinct from (to_jsonb(old) - array['balance', 'updated_at']) then
      raise exception 'A cashier may only change a wallet balance.';
    end if;
  end if;
  return new;
end;
$$;

create trigger trg_enforce_cashier_wallet_update
  before update on public.wallets
  for each row execute function public.enforce_cashier_wallet_update();
