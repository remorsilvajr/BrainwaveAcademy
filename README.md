# Brainwave Preschool Academy

A school admin / enrollment portal for Brainwave Preschool Academy, built with Next.js and Supabase. Public marketing site plus a public enrollment form live outside auth; everything else is gated behind one of three roles — **admin**, **teacher**, **parent** — each with its own dashboard, sidebar, and set of pages. A super-admin tier also exists on top of `admin` (a `profiles.is_super_admin` flag, not a fourth role) for a small set of irreversible protections — see `CLAUDE.md` for how it works and why it's deliberately not exposed anywhere in the UI.

**Live**: https://brainwave-academy-phi.vercel.app/

## Features

### Public site

- Landing page with school info, program highlights, founder profile, and the 6 developmental domains
- Multi-step public enrollment form (student info → program selection → parent/guardian info), with a honeypot spam guard
- Login, Forgot/Reset Password, with brute-force lockout after repeated failed attempts
- Privacy Policy and Terms of Service with real, jurisdiction-specific content (RA 10173 / National Privacy Commission)
- FAQ page, branded 404, sitemap/robots.txt, and an auto-generated OG image
- Cookie consent notice, and dark mode across the entire site

### Parent portal

- Dashboard with enrollment progress, due balance, wallet balance, and recent announcements — every card links to its full page
- Enroll a Student (in-portal wizard for a second/subsequent child)
- Requirements checklist with document upload
- Enrollment Status tracker, with a way to remove a rejected application
- Enrollment/Student Profile (read-only record + editable photo once enrolled)
- Student Dashboard — read-only attendance and 6-domain milestone tracker
- Payments — wallet balance, itemized fees, pay-with-wallet, payment history, printable receipts, and wallet top-up requests
- Authorized Pickup — register the people allowed to pick up each child, with photo and ID details
- School Calendar — view holidays/events and RSVP Going/Not Going
- Feedback — Report a Bug / Feedback & Concerns / My Feedback, in its own sidebar section

### Teacher portal

- Dashboard with attendance summary, interactive student check-in, milestone summary, and classroom announcements — every card links to its full page
- Announcements scoped to the teacher's assigned classroom(s), or all parents
- Student directory with classroom column and filter
- Attendance — date-selectable student attendance, editable for today only
- Student Dashboard — attendance and 6-domain milestone assessments (edit-in-place)
- Pickup Verification — look up a child's authorized pickup list and confirm a match by name
- School Calendar — view holidays/events
- Feedback — same Report a Bug / Feedback & Concerns / My Feedback tabs as parent

### Admin portal

- Dashboard with real, live stats (pending applications, active enrollment, unresolved feedback, today's collections, pending fund requests) — every card links to its full page
- User Management — edit, block, and role management, with a hidden super-admin protection tier
- Enrollment Requests and Applications — the two-stage review pipeline from a submitted request to a verified, enrolled student
- Create New Account (manual account provisioning)
- Payments — tabbed Payments / Parent Wallets / Payment Requests (with a pending-count badge), manual cash/check recording, and wallet fund request review
- Students, Teachers, and Classrooms directories, with student list and fee-schedule management
- Student Dashboard with full edit rights and avatar upload
- Export Progress Reports — printable per-student milestone + attendance report
- Pickup Verification — same lookup tool as teacher
- School Calendar — create, edit, and publish events/holidays, with RSVP headcounts
- Feedback inbox — categorize and reply to every submission, with a submitter-visible response
- Activity Log — a searchable audit trail of account, enrollment, payment, and student-data changes
- Deleted Items (soft-delete review, super-admin only)

### Under the hood

- Role-based access enforced in middleware, backed by Row Level Security on every table
- A closed-loop parent wallet system (no real payment gateway, by design) for tuition/fee payments
- Real transactional email (Brevo for the app's own emails, Postmark for Supabase Auth's password-reset emails)
- An audit trail (`activity_log`) wired into essentially every mutation across the app

## Tech stack

- [Next.js 16](https://nextjs.org) (App Router, Server Actions) + React 19 + TypeScript
- [Supabase](https://supabase.com) — Postgres, Auth, Storage, Row Level Security
- [Tailwind CSS v4](https://tailwindcss.com) (CSS-based config, no `tailwind.config.*`)
- [Brevo](https://www.brevo.com) for the app's own outbound email (welcome/correction emails); [Postmark](https://postmarkapp.com) for Supabase Auth's own emails (password reset)
- Deployed on [Vercel](https://vercel.com)

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The dev server needs a `.env.local` with a working Supabase project — see **Environment variables** below. Without it, pages that touch the database will error.

Other commands:

```bash
npm run build   # production build
npm run start   # run the production build
npm run lint    # ESLint
```

There's no automated test suite — "testing" here means exercising the real running app (submit the form, check the terminal for errors), not just a clean build.

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

`NEXT_PUBLIC_SITE_URL` must be the real deployed URL (no trailing slash) in Vercel's own env var settings — it's only `http://localhost:3000` locally. Supabase's own Auth SMTP integration (used for password-reset emails) is configured separately, in the Supabase dashboard rather than here — see `CLAUDE.md` for details.

Optional: `DATABASE_URL` — a direct Postgres connection string for one-off scripts/debugging only; the app itself doesn't read it.

## Project structure

- `app/` — routes, grouped by role (`app/admin`, `app/teacher`, `app/parent`) plus the public site (`app/page.tsx`, `app/enroll`, `app/login`, etc.)
- `components/` — shared UI, also grouped by role where relevant
- `lib/` — Supabase clients, email, validation, and other shared server-side logic
- `middleware.ts` — the single gatekeeper for role-based route access

Database schema lives directly in the Supabase project (no migrations checked into this repo).

## For contributors / AI agents

`CLAUDE.md` is the detailed reference for this codebase — product requirements per role, architecture notes, real bugs found and fixed (with root causes), and conventions to follow. Read it before making non-trivial changes; it's kept up to date as the source of truth for *why* things are built the way they are, not just what exists.
