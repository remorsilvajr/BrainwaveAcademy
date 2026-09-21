-- Program age ranges move from whole years to whole completed months, both ends
-- inclusive (the school's ranges are 1y 6m - 2y 0m, 2y 1m - 2y 10m, and so on).
-- The old min_age_years/max_age_years columns are left in place and unused, so the
-- app that is currently deployed keeps working until the new code is live.
alter table public.classrooms
  add column if not exists min_age_months integer,
  add column if not exists max_age_months integer;

update public.classrooms set min_age_months = 18, max_age_months = 24 where slug = 'little-explorers';
update public.classrooms set min_age_months = 25, max_age_months = 34 where slug = 'advanced-toddler';
update public.classrooms set min_age_months = 35, max_age_months = 46 where slug = 'smart-explorers';
update public.classrooms set min_age_months = 47, max_age_months = 58 where slug = 'curious-adventurers';
-- 5-18 years, up to the 19th birthday: the same span the years columns meant.
update public.classrooms set min_age_months = 60, max_age_months = 227 where slug in ('academic-tutorials', 'quiz-bee-exam-prep');
