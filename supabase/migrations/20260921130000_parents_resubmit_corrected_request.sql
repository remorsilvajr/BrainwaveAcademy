-- Lets a parent fix the details of their own enrollment request after the school
-- asked for a correction (status needs_correction) and resubmit it (back to
-- pending_review). (The needs_correction status already exists in the baseline schema.)
--
-- RLS restricts rows, not columns, so the policy alone would let the parent rewrite
-- anything on the row. The trigger is what limits it: in this one transition only the
-- correctable details and the status may change (it compares the whole row as jsonb
-- minus that list, so a column added later is protected automatically). Everything
-- else, including created_parent_id, reviewed_by, reviewed_at, review_notes,
-- created_student_id and archived, must stay as it was.

create or replace function public.enforce_applications_parent_lock() returns trigger
    language plpgsql
    as $$
declare
  correctable text[] := array[
    'status',
    'student_first_name', 'student_middle_name', 'student_last_name', 'student_dob', 'student_gender',
    'parent_first_name', 'parent_middle_name', 'parent_last_name', 'parent_dob',
    'parent_relationship', 'parent_gender', 'parent_contact_number',
    'requested_classroom_id', 'requested_program_options'
  ];
begin
  if auth_role() = 'admin' then
    return new;
  end if;

  if old.status = 'needs_correction' and new.status = 'pending_review' and old.created_parent_id = auth.uid() then
    if to_jsonb(new) - correctable is distinct from to_jsonb(old) - correctable then
      raise exception 'Only the details you were asked to correct may be changed here.';
    end if;
    return new;
  end if;

  if to_jsonb(new) - 'hidden_from_parent' is distinct from to_jsonb(old) - 'hidden_from_parent' then
    raise exception 'Only hidden_from_parent may be changed here.';
  end if;
  return new;
end;
$$;

create policy parents_resubmit_own_application on public.applications
  for update to public
  using (created_parent_id = auth.uid() and status = 'needs_correction')
  with check (created_parent_id = auth.uid() and status = 'pending_review');
