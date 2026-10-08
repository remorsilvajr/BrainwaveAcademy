-- Class-photo consent: whether a child may appear in the regular class photos
-- in the Photo Album (other parents of that class can see them).
-- null = the parent hasn't answered yet, which the app treats as NOT allowed.
-- Asked on both enroll forms (stored on the application, copied to the
-- student at approval) and changeable by the parent in Settings and in the
-- Photo Album. Run this whole file as one block in the Supabase SQL Editor.

alter table public.students add column photo_consent boolean;
alter table public.students add column photo_consent_updated_at timestamp with time zone;
alter table public.applications add column photo_consent boolean;

-- A parent may now change their own child's photo consent as well as the
-- avatar (parents_update_own_children_avatar already limits which rows);
-- every other column stays locked for them, same pattern as before.
create or replace function public.enforce_students_parent_lock() returns trigger
    language plpgsql
    as $$
begin
  if auth_role() = 'admin' then
    return new;
  end if;
  if to_jsonb(new) - 'avatar_url' - 'photo_consent' - 'photo_consent_updated_at'
     is distinct from to_jsonb(old) - 'avatar_url' - 'photo_consent' - 'photo_consent_updated_at' then
    raise exception 'Only avatar_url and photo consent may be changed here.';
  end if;
  return new;
end;
$$;
