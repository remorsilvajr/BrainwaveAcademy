# Brain Wave Academy

A school admin / enrollment portal for Brain Wave Academy (Tagum City), built with Next.js and Supabase. Public marketing site plus a public enrollment form live outside auth; everything else is gated behind one of four roles: **admin**, **teacher**, **cashier**, **parent**, each with its own dashboard, sidebar, and set of pages. A super-admin tier also exists on top of `admin` (a `profiles.is_super_admin` flag, not another role) for a small set of irreversible protections. See `CLAUDE.md` for how it works and why it's deliberately not exposed anywhere in the UI.

**Live**: https://brainwave-academy-phi.vercel.app/

## Features

### Public site

- Landing page with school info, program highlights, founder profile, and the 6 developmental domains
- Multi-step public enrollment form (student info, program selection, parent/guardian info), with a honeypot spam guard and required consent. Programs the child is too young or too old for are locked **with the reason shown** (the child's age and the program's age range), and the parent answers whether the child may appear in class photos
- Login, Forgot/Reset Password, with brute-force lockout after repeated failed attempts and a clear message for blocked accounts
- Privacy Policy and Terms of Service with real, jurisdiction-specific content (RA 10173 / National Privacy Commission)
- FAQ page, branded 404, sitemap/robots.txt, and an auto-generated OG image
- Cookie consent notice, and dark mode across the entire site

### Parent portal

- Dashboard with enrollment progress, due balance, a Pay Online card, and recent announcements (plus a reminder while a child's class-photo answer is missing). Every card links to its full page
- Enroll a Student (in-portal wizard for a second/subsequent child)
- **Create your own account when you enroll**: type your password twice on the enroll form, and you are signed in straight away and can upload requirements right after submitting
- Requirements checklist with document upload, a live count of what is still missing or needs correcting, and the school's note on each document that needs correcting
- Enrollment Status tracker, with a way to remove a rejected application, and **Update & Resubmit** when the school asks for a correction
- **Unenroll a Student**: ask the school to withdraw a child, and see the decision (with the admin's note)
- Enrollment/Student Profile (read-only record + editable photo once enrolled)
- Student Dashboard: read-only attendance and 6-domain milestone tracker
- **Payments: pay online by card or GCash**, any amount at a time (it goes to the fee due soonest; a fee can be paid in parts). The checkout is a **sandbox** for now: it uses Ezypay's published test numbers, no real money moves, and only the card brand and last four digits are kept. A "Paid successfully" screen, payment history, and a printable receipt (and receipt email) for every payment
- Authorized Pickup: register the people allowed to pick up each child (first/middle/last name, relationship, phone, photo)
- **Health & Emergency**: allergies, conditions, medications, doctor/hospital, and up to 3 emergency contacts per child
- **Photo Album**: photos teachers upload, by date, only for the child's own class
- **Class photo permission**: choose whether each child may appear in class photos (asked at enrollment, changeable any time in Settings or the Photo Album; until answered, the child is kept out)
- School Calendar: view holidays/events and RSVP Going/Not Going
- Feedback: Send Feedback / My Feedback, in its own sidebar section
- **Notification bell** in the top bar and **numbers beside sidebar tabs** (new announcements, events, album photos, replies; they clear when you open the tab), plus email for important decisions and, optionally, fee reminders and payment receipts
- One child switcher in the top bar; pages that depend on the selected child say whose they are ("Enrollment Status for Ana Cruz")

### Teacher portal

- Dashboard with attendance summary, interactive student check-in, milestone summary, and classroom announcements. Every card links to its full page
- Announcements scoped to the teacher's assigned classroom(s), or all parents
- Student directory with classroom column and filter
- Attendance: date-selectable, editable for today only (Tutorial and Quiz Bee programs have no daily attendance)
- Student Dashboard: a class filter and student picker, the child's age, attendance, 6-domain milestone assessments (edit-in-place), and a read-only health summary with a red allergy alert
- Pickup Verification: type a name, or scan the QR on a pickup card, and get "authorized", "similar name, ask again" or "not on file"
- **Photo Album**: upload photos into today's folder for a class the teacher teaches, with a list of the children whose parents have not allowed class photos
- School Calendar: view holidays/events
- Feedback, the notification bell and sidebar badges, same as parent

### Admin portal

- Dashboard with real, live stats (pending applications, active enrollment, unresolved feedback, today's collections, outstanding balance, paid online today, pending unenrollments). Every card links to its full page
- User Management: edit, block, and role management, with a hidden super-admin protection tier. **Only a super admin can make an account an admin**, and **a super admin can set another account's password** (never emailed; signs that account out everywhere and notifies the owner)
- Enrollment Requests and Applications: the two-stage review pipeline from a submitted request to a verified, enrolled student. **Approve, Reject or Request Correction** (each with an admin note where it matters) emails and notifies the parent automatically; a **note is required on every document marked Needs Correction**
- **Numbers beside sidebar tabs** show what is waiting: enrollment requests, applications to review, unenrollment requests, unresolved feedback
- Create New Account (manual account provisioning): the new user gets a one-time link to choose their own password; nobody at the school ever sees or sends one
- **Payments (three tabs)**: **Fees** (what is owed), **Received** (every payment, online or cash, with receipts) and **Student Balances** (every student's total fees, paid, still owed, overdue and last payment, with Add Fee and View Fees per student). Cash can be recorded in full or in part. **Fee corrections** (edit, waive, void, reverse a payment, including a partly paid fee), each with a written reason and an audit trail
- **Unenrollment Requests**: approve or decline a withdrawal, choosing whether unpaid fees are kept or waived; the parent is emailed
- **Student Attendance**: any day's attendance per class (present, late, absent, not marked, with allergy alerts), read-only since teachers record it, plus every student attendance record, filterable by date range, status and program
- Students (with an Outstanding balance column and a Balance tab where admin can also add a fee), Teachers, and Classrooms directories. A class has any number of **equal teachers** (no head teacher), and fee due dates are managed per class
- **Teacher Attendance**: record each teacher present, late or absent for any date up to today, plus every teacher attendance record
- Student Dashboard with a class filter, milestone edit rights and avatar upload (attendance is view-only for admin), and Export Report whose Back returns to it; **Health** tab and class-photo answer on each student record
- **Automatic move-up and preschool completion**: the daily job moves a child into the next class once they outgrow theirs (adding the new class's fees, keeping the old ones); a child past Curious Adventurers completes preschool once nothing is owed (Pending Completion until then, admin can also complete by hand), gets no new fees, and has a printable Certificate of Completion for admin and parents
- **Hidden Features (super admin only)**: the Do-Not-Release list is built but parked until it is reworked
- **Authorized pickup**: admin can add, edit (including the photo) and remove a child's pickup people, and the parents are notified of every change. Each person has a printable View Card with photo and a QR Pickup ID that staff scan in Pickup Verification
- **Cashier portal**: a fourth role whose only area is Payments (record cash payments, in full or in part)
- Export Progress Reports: printable per-student milestone, attendance and program-history report
- Pickup Verification, School Calendar (create/edit/publish events, RSVP headcounts), and Photo Album (view and delete)
- Feedback inbox: categorize and reply to every submission, with a submitter-visible response
- Activity Log: a searchable audit trail of account, enrollment, payment, and student-data changes
- Deleted Items (soft-delete review, super-admin only)

### Under the hood

- Role-based access enforced in middleware, backed by Row Level Security on every table
- Online fee payment through a **sandbox checkout** (Ezypay test card and GCash numbers; no real gateway yet). Fees can be paid in parts, every payment gets its own receipt, and the server alone can mark a fee paid online. (The earlier parent wallet is retired from every screen; its data is kept.)
- Real transactional email (Brevo for the app's own emails, Postmark for Supabase Auth's password-reset emails)
- In-app notifications and a daily job (Vercel cron) that sends fee reminders and photo digests
- An audit trail (`activity_log`) wired into essentially every mutation across the app

## Tech stack

- [Next.js 16](https://nextjs.org) (App Router, Server Actions) + React 19 + TypeScript
- [Supabase](https://supabase.com): Postgres, Auth, Storage, Row Level Security
- [Tailwind CSS v4](https://tailwindcss.com) (CSS-based config, no `tailwind.config.*`)
- [Brevo](https://www.brevo.com) for the app's own outbound email; [Postmark](https://postmarkapp.com) for Supabase Auth's own emails (password reset)
- [Vitest](https://vitest.dev) for tests, GitHub Actions for CI
- Deployed on [Vercel](https://vercel.com)

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The dev server needs a `.env.local` with a working Supabase project, see **Environment variables** below. Without it, pages that touch the database will error.

Commands:

```bash
npm run dev               # dev server
npm run build             # production build
npm run start             # run the production build
npm run lint              # ESLint
npm run typecheck         # TypeScript
npm test                  # unit tests (no network)
npm run test:integration  # RLS, payments (partial, online, cashier), unenrollment, album, photo consent, auto move-up, preschool completion and daily-job checks against the real Supabase project (self-cleaning)
npm run test:sweep        # remove leftovers from an interrupted integration run
npm run db:verify         # prove supabase/migrations rebuild the live schema (needs Docker)
npm run backup            # save all data + uploaded files to backups/ (gitignored)
npm run restore -- <folder> --dry-run   # check a backup; drop --dry-run to restore into a NEW empty project
npm run restore:drill -- <folder>       # prove a backup restores, in a throwaway Docker database
```

Never run `npm run build` while `npm run dev` is running; both write to `.next/`.

## Safety nets: what the migrations, backups, tests and CI are for

None of these change what users see. They protect the school's data and stop changes from silently breaking things.

- **Schema files (`supabase/migrations`)**: the database's structure (tables, permissions, security rules) used to exist only inside Supabase. Now the blueprint is saved in the repo, so the database can be rebuilt from scratch, and `npm run db:verify` checks that the files still match the live database. Every schema change is saved as a new numbered file.
- **Backups (`npm run backup` / `restore`)**: a copy of all the data, accounts (with password hashes, so logins survive) and uploaded files on your own computer. If data is wiped or a bad change corrupts it, restore into a fresh project. `restore:drill` proves a backup really restores, since an untested backup may not work when you need it. Backups hold children's personal data: keep them private, never commit or share them.
- **Automated tests**: scripts that check the rules for you. Unit tests cover ages, dates, validation, fees and email text; integration tests sign in as throwaway users and check that, for example, a parent can't make themselves admin, one family can't see another's child's health information, and a fee can't be marked paid without paying. Before, the only way to know a change was safe was to click through the site.
- **CI (GitHub Actions)**: a robot that runs lint, typecheck and the unit tests on every push and emails you if something breaks. It does not run the integration tests, which write to the live project.

Details: [`supabase/README.md`](supabase/README.md) (migrations, backup, restore) and [`tests/README.md`](tests/README.md) (tests).

## Environment variables

Required in `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
BREVO_SMTP_USER=
BREVO_SMTP_KEY=
BREVO_SENDER_EMAIL=
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

`NEXT_PUBLIC_SITE_URL` must be the real deployed URL (no trailing slash) in Vercel's own env var settings; it's only `http://localhost:3000` locally. Supabase's own Auth SMTP integration (used for password-reset emails) is configured separately, in the Supabase dashboard rather than here. See `CLAUDE.md` for details.

Also needed in **Vercel** (not locally): `CRON_SECRET`, any long random string. The daily reminder job (`/api/cron/daily`, 18:00 Manila) refuses to run without it.

Optional: `DATABASE_URL`, a direct Postgres connection string (pooler string) used by the scripts (`db:verify`, `backup`, `restore`, `test:sweep`) and one-off debugging; the app itself doesn't read it.

## Project structure

- `app/`: routes, grouped by role (`app/admin`, `app/teacher`, `app/parent`) plus the public site (`app/page.tsx`, `app/enroll`, `app/login`, etc.) and `app/api/cron/daily`
- `components/`: shared UI, also grouped by role where relevant
- `lib/`: Supabase clients, email, validation, fee/date/school rules, notifications, and other shared server-side logic
- `middleware.ts`: the single gatekeeper for role-based route access
- `supabase/`: `migrations/` (the full schema), `seed.sql` (classrooms and holidays), and its `README.md`
- `scripts/`: `db:verify`, backup, restore, restore drill, and test-data sweep
- `tests/`: `unit/` and `integration/`, with its own `README.md`
- `.github/workflows/ci.yml`: CI

## For contributors / AI agents

`CLAUDE.md` is the detailed reference for this codebase: product requirements per role, architecture notes, real bugs found and fixed (with root causes), and conventions to follow. Read it before making non-trivial changes; it's kept up to date as the source of truth for *why* things are built the way they are, not just what exists.
