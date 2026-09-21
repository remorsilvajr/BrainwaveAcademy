-- Teacher attendance: the admin records whether each teacher was present, late or absent,
-- one row per teacher per day. (Student attendance stays in public.attendance and is
-- recorded by teachers.) The unique (teacher_id, date) lets a re-mark update the day's row
-- instead of piling up duplicates.
--
-- Only an admin may write. A teacher may read their own rows only, and nobody else has
-- any access, so a parent or another teacher can never see a teacher's attendance.

create table public.teacher_attendance (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.profiles(id) on delete cascade,
  date date not null,
  status public.attendance_status not null,
  recorded_by uuid references public.profiles(id),
  created_at timestamp with time zone not null default now(),
  constraint teacher_attendance_teacher_date_key unique (teacher_id, date)
);

create index teacher_attendance_date_idx on public.teacher_attendance (date desc);

alter table public.teacher_attendance enable row level security;

create policy admins_manage_teacher_attendance on public.teacher_attendance
  for all to public
  using (public.auth_role() = 'admin')
  with check (public.auth_role() = 'admin' and (recorded_by is null or recorded_by = auth.uid()));

create policy teachers_view_own_teacher_attendance on public.teacher_attendance
  for select to public
  using (teacher_id = auth.uid());
