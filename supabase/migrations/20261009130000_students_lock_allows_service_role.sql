-- The daily job (app/api/cron/daily, lib/auto-promotion.ts) moves a child who has
-- outgrown their class into the next one. It runs with the service-role key and no
-- signed-in user, so auth_role() is null and this lock refused every change except
-- the avatar/consent columns. The service role already bypasses RLS and is only
-- used by trusted server code, so let it through here too. Everything else is the
-- same as 20261008120000_photo_consent.sql.
create or replace function public.enforce_students_parent_lock() returns trigger
    language plpgsql
    as $$
begin
  if auth_role() = 'admin' or auth.role() = 'service_role' then
    return new;
  end if;
  if to_jsonb(new) - 'avatar_url' - 'photo_consent' - 'photo_consent_updated_at'
     is distinct from to_jsonb(old) - 'avatar_url' - 'photo_consent' - 'photo_consent_updated_at' then
    raise exception 'Only avatar_url and photo consent may be changed here.';
  end if;
  return new;
end;
$$;
