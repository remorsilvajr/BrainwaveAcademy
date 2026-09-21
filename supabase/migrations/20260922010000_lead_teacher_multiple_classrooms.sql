-- A teacher may now be the lead of more than one classroom. Being both lead and
-- assistant of the SAME classroom is still refused by the app.
drop index if exists public.classrooms_lead_teacher_unique;
