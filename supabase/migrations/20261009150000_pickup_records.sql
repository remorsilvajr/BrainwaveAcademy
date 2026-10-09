-- Pickup history: one row each time staff record that a child was picked up
-- (Pickup Verification's "Record Pickup", after a card scan or a name match).
-- The person's name and relationship, the child's name and the recorder's name are
-- copied in at that moment, so the history still reads correctly after a pickup
-- person is edited or removed (authorized_pickup_id is then set null).
create table public.pickup_records (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  authorized_pickup_id uuid references public.authorized_pickups(id) on delete set null,
  student_name text not null,
  person_name text not null,
  relationship text,
  method text not null check (method in ('scan', 'name')),
  recorded_by uuid not null references public.profiles(id),
  recorded_by_name text not null,
  picked_up_at timestamptz not null default now()
);

create index pickup_records_student_idx on public.pickup_records (student_id, picked_up_at desc);
create index pickup_records_time_idx on public.pickup_records (picked_up_at desc);

alter table public.pickup_records enable row level security;

-- Teachers and admin see every child's history; a parent sees their own children's.
create policy staff_view_pickup_records on public.pickup_records
  for select using (public.auth_role() in ('admin'::public.user_role, 'teacher'::public.user_role));

create policy parents_view_own_children_pickup_records on public.pickup_records
  for select using (
    exists (select 1 from public.parent_student ps where ps.student_id = pickup_records.student_id and ps.parent_id = auth.uid())
  );

-- Only teachers and admin record a pickup, always as themselves, at the current
-- time. No update or delete: the history can't be rewritten.
create policy staff_insert_pickup_records on public.pickup_records
  for insert with check (
    public.auth_role() in ('admin'::public.user_role, 'teacher'::public.user_role)
    and recorded_by = auth.uid()
    and picked_up_at between now() - interval '1 minute' and now() + interval '1 minute'
  );
