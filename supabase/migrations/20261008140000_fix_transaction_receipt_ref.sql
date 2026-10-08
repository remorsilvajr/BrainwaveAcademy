-- Hotfix: generate_transaction_receipt_ref (20261008130000) wrote to
-- ref_counters (key, value), but the table's columns are (prefix, year,
-- last_value). Every new payment_transactions row failed, which broke wallet
-- payments. Same pattern as generate_receipt_ref, with its own 'RCT-T' counter.
CREATE OR REPLACE FUNCTION public.generate_transaction_receipt_ref() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  current_year int := extract(year from now());
  next_val int;
begin
  if new.receipt_ref is not null then
    return new;
  end if;
  insert into ref_counters (prefix, year, last_value)
  values ('RCT-T', current_year, 1)
  on conflict (prefix, year)
  do update set last_value = ref_counters.last_value + 1
  returning last_value into next_val;
  new.receipt_ref := 'RCT-' || current_year || '-T' || lpad(next_val::text, 4, '0');
  return new;
end;
$$;
