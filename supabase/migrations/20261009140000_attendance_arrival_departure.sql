-- Arrival and departure times on a student's daily attendance (Manila local time,
-- recorded by the teacher on the check-in roster). Both optional: an absent day has
-- neither, and departure is only set once the child has left. A departure needs an
-- arrival and can't be before it. Existing rows get nulls; the existing
-- teachers_manage_attendance / admin policies already cover the new columns.
alter table public.attendance
  add column arrival_time time,
  add column departure_time time;

alter table public.attendance
  add constraint attendance_departure_after_arrival
  check (departure_time is null or (arrival_time is not null and departure_time >= arrival_time));

-- A teacher may only take attendance for the classes they teach (a classroom_assistants
-- row, or the legacy lead_teacher_id). Reading stays open to every teacher (the
-- Records tab and Student Dashboards show all classes). The old policy let any
-- teacher insert, update or delete any student's attendance; teachers never delete.
drop policy if exists teachers_manage_attendance on public.attendance;

create policy teachers_view_attendance on public.attendance
  for select using (public.auth_role() = 'teacher'::public.user_role);

create policy teachers_insert_own_class_attendance on public.attendance
  for insert with check (
    public.auth_role() = 'teacher'::public.user_role
    and recorded_by = auth.uid()
    and exists (
      select 1 from public.students s
      where s.id = attendance.student_id
        and s.classroom_id is not null
        and (
          exists (select 1 from public.classroom_assistants ca where ca.classroom_id = s.classroom_id and ca.teacher_id = auth.uid())
          or exists (select 1 from public.classrooms c where c.id = s.classroom_id and c.lead_teacher_id = auth.uid())
        )
    )
  );

create policy teachers_update_own_class_attendance on public.attendance
  for update using (
    public.auth_role() = 'teacher'::public.user_role
    and exists (
      select 1 from public.students s
      where s.id = attendance.student_id
        and s.classroom_id is not null
        and (
          exists (select 1 from public.classroom_assistants ca where ca.classroom_id = s.classroom_id and ca.teacher_id = auth.uid())
          or exists (select 1 from public.classrooms c where c.id = s.classroom_id and c.lead_teacher_id = auth.uid())
        )
    )
  ) with check (
    public.auth_role() = 'teacher'::public.user_role
    and recorded_by = auth.uid()
    and exists (
      select 1 from public.students s
      where s.id = attendance.student_id
        and s.classroom_id is not null
        and (
          exists (select 1 from public.classroom_assistants ca where ca.classroom_id = s.classroom_id and ca.teacher_id = auth.uid())
          or exists (select 1 from public.classrooms c where c.id = s.classroom_id and c.lead_teacher_id = auth.uid())
        )
    )
  );
