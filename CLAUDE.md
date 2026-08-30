# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Project

Brainwave Preschool Academy — a Next.js (App Router) admin/enrollment portal backed by Supabase (Postgres + Auth). Three user roles — `admin`, `teacher`, `parent` — each with its own route section, sidebar nav, and dashboard. Public marketing site + enrollment form live outside auth; everything else is role-gated.

This is a student capstone/school project. It needs to run identically when cloned onto any of 4 different PCs for a sprint retro (solved via a single shared cloud Supabase project + `.env.local`, not local Postgres).

## Commands

```bash
npm run dev      # start dev server (localhost:3000)
npm run build    # production build
npm run start    # run production build
npm run lint     # eslint (flat config, eslint-config-next)
```

There is no test runner configured in this repo.

## Before writing Next.js code

This repo pins `next@16.3.3`, which is newer than most training data and has breaking API changes vs. Next 13/14 conventions. Per `AGENTS.md`, read the relevant guide under `node_modules/next/dist/docs/{01-app,02-pages,03-architecture,04-community}` before writing routing, data-fetching, or server-action code, and follow any deprecation notices found there.

## Product requirements

### Public site (unauthenticated)

- **Landing page** (`app/page.tsx`): school info from Figma. Header has About Us / Programs / 6 Domains links that scroll to in-page sections (`#about-us`, `#programs`, `#domains`), plus Enroll (→ `/enroll`) and Log In (→ `/login`) buttons. "Grading & Feedback" was in an early Figma header but has no corresponding content — intentionally removed from nav.
- **Enroll** (`/enroll`): public form, no auth required. Fields — Student: First/Middle/Last Name, DOB, Gender. Parent/Guardian: First/Middle/Last Name, DOB, Relationship, Contact Number, Email. Submits straight into the `applications` table (anon insert allowed via RLS policy). On submit, applicant sees a confirmation that admin will review and email credentials once approved — **no account is created at this step.**
- **Login** (`/login`): email + password. Forgot-password link.
- **Forgot password** (`/forgot-password` → `/auth/confirm` → `/reset-password`): email a reset link; link exchanges a Supabase code/token for a session, then the user sets a new password.

### Parent portal (`/parent`)

Sidebar: Dashboard, Announcement, **Enrollment** (Enroll A Student, Requirements, Payments, Enrollment Status), **Student** (Students, Student Dashboard), **Account** (My Profile, Settings, Log Out).

- **Dashboard**: "Welcome back, (title + last name)", enrollment progress, due balance, recent announcements, school updates.
- **Enroll A Student**: same student-info fields as the public enroll form, minus parent info (parent is already known/logged in) — for enrolling additional children.
- **My Profile**: Full Name + Email locked; Phone Number, DOB, Relationship to Student editable. Shows Account ID (`PRT-YYYY-####`, auto-generated) and Status (Verified/Not).
- **Student Dashboard**: attendance, latest assessment, development milestone tracker (Physical Health & Motor, Character & Values, Language, Social-Emotional, Cognitive, Creative), recent daily attendance.
- **Settings**: change password (needed since parents start with an admin-issued temp password).
- All other parent pages (Announcement, Requirements, Payments, Enrollment Status, Students) are intentionally empty placeholders for now.

### Teacher portal (`/teacher`)

Sidebar: Dashboard, Announcement, Students, Student Dashboard, My Profile, Settings, Log Out (Log Out wasn't in the original spec for teachers but was added for usability parity with the other two roles).

- **Dashboard**: Attendance, Milestones, Announcements, Pending Student Assessments.
- **Students**: list of all students with a "Show Student Record" action per row.
- **Student Dashboard** / **My Profile**: same shape as the parent versions, teacher-facing.

### Admin portal (`/admin`)

Sidebar: Dashboard, Announcement, User Management, Create New Account, **Enroll A Student**, **Applications**, Students, Student Dashboard, Settings, Log Out.

**"Enroll A Student" and "Applications" are two separate, easily-confused features — do not merge them:**

- **`/admin/enroll-a-student`** — reviews landing-page enrollment _requests_ (rows in the `applications` table with `status = 'pending_review'`) and approves them. Approving: creates the parent's `auth.users` account + `profiles` row (or reuses an existing parent profile if this is a second child — matched by email, no duplicate account or email sent in that case), creates the `students` row, links them via `parent_student`, marks the application `approved`, and emails the parent a temp password. **This is fully built** — see `app/admin/enroll-a-student/actions.ts`.
- **`/admin/applications`** — a _separate, not-yet-built_ document-verification workflow (Birth Certificate, 2x2 ID Photos, Proof of Address, Guardian Valid ID — filters for Pending Document Review / Needs Correction / Approved Today). Currently a placeholder page only. No document upload UI exists anywhere yet, even though `application_documents` is already a table.
- **Dashboard**: Pending Applications, Active Student Enrollment, Unsolved Feedback, Recent Financial Transactions, Priority Actions & Log. Currently static demo numbers, not wired to real queries.
- **User Management**: filters (Total/Active/Inactive/Blocked), user list with role/status/last-active, Edit/Block actions. Placeholder.
- **Create New Account**: photo upload (optional), name/email/phone, role select, auto-generate password. Placeholder — not yet wired to `createAdminClient()`.

## Architecture

**Role-based routing via middleware, not layout guards.** `middleware.ts` is the single gatekeeper for `/admin`, `/teacher`, `/parent`:

- Unauthenticated users hitting a protected path are redirected to `/login`.
- Authenticated users are read from the `profiles` table (`role` column) and bounced to `/${role}` if they try to access a section that isn't theirs (e.g. a parent visiting `/admin/*` is redirected to `/parent`).
- The matcher excludes `_next/static`, `_next/image`, `favicon.ico`, and static image extensions.

Each role has its own `app/<role>/layout.tsx` that renders `<Sidebar>` (`components/sidebar.tsx`) with a hardcoded `NavSection[]` array for that role — this is the source of truth for what pages exist under each role and their nav labels. There's no shared nav config; adding a page means adding both the route and a matching sidebar entry in that role's layout.

**Supabase client selection matters and is security-sensitive** (`lib/supabase/`):

- `client.ts` — `createClient()` (sync) for Client Components only.
- `server.ts` — `createClient()` (async, must be `await`ed) for Server Components, Server Actions, and Route Handlers. Cookie writes are wrapped in try/catch because Server Components can't set cookies — the middleware's session refresh covers that case.
- `admin.ts` — `createAdminClient()` uses the Supabase **service role key** and bypasses Row Level Security entirely. Never import it into a Client Component; never expose `SUPABASE_SERVICE_ROLE_KEY` with a `NEXT_PUBLIC_` prefix. Currently only used in `app/admin/enroll-a-student/actions.ts` to create parent auth accounts.

**Auth/mutation logic lives in `actions.ts` files colocated with their route** (e.g. `app/login/actions.ts`, `app/enroll/actions.ts`, `app/forgot-password/actions.ts`, `app/admin/enroll-a-student/actions.ts`), marked `'use server'`.

**Form state pattern**: forms that need field-level errors without losing typed input on failure use React's `useActionState`, not client-side validation + redirect. The Server Action returns `{ error?, fieldErrors?, values? }` — `values` echoes back exactly what was submitted so the form can repopulate itself via `defaultValue` even after a full round trip, and `fieldErrors` renders per-field. See `app/enroll/actions.ts` / `components/enroll/enrollment-form.tsx` as the reference implementation. **`<select>` elements must use controlled `value`/`onChange`, not `defaultValue`** — React re-applies a select's `defaultValue` on every re-render (unlike `<input>`, where it only applies once at mount), which caused dropdowns to silently reset on unrelated state changes.

**Email** goes through `lib/email.ts` (`sendEmail`), which uses `nodemailer` against Brevo's SMTP relay. This is separate from Supabase Auth's own emails (password reset, etc.), which are configured to use Brevo too, but via Supabase's dashboard SMTP settings, not this code path. (History: Resend was tried first but blocked — no domain the project controls DNS for; SendGrid/Twilio was blocked by a phone-verification wall; Brevo was the one that worked without either.)

**ID generation via SECURITY DEFINER triggers**: `profiles.account_id` (`PRT-YYYY-####` / `TCH-YYYY-####`) and `applications.application_ref` (`APP-YYYY-####`) are both generated by Postgres trigger functions (`generate_account_id()`, `generate_application_ref()`) backed by a shared `ref_counters` table keyed on `(prefix, year)`. `ref_counters` has RLS enabled with **zero policies on purpose** — nothing should touch it except these two trigger functions, which are marked `SECURITY DEFINER` with a fixed `search_path` specifically so they can write to it regardless of the calling role (anon visitor submitting the public enroll form, or a logged-in admin). If you ever see "new row violates row-level security policy for table ref_counters" again, the fix is on the trigger function side, not by adding a policy.

## Route status (as of last working session)

| Route                                                           | Status                                                  |
| --------------------------------------------------------------- | ------------------------------------------------------- |
| `/`, `/enroll`, `/login`, `/forgot-password`, `/reset-password` | Fully built and wired                                   |
| `/admin/enroll-a-student`                                       | Fully built (approve → account + student + email)       |
| `/admin/applications`                                           | Placeholder only — document verification not built      |
| `/parent/settings`                                              | Built (change password)                                 |
| `/parent/enroll-a-student`                                      | **Static shell only, not wired to a Server Action yet** |
| `/parent` dashboard, My Profile, Student Dashboard              | Static shells with placeholder data                     |
| All other parent/teacher/admin pages not listed above           | Static placeholder shells                               |

## Database

No migrations are checked into the repo — schema lives in Supabase directly, evolved via one-off SQL run manually in the Supabase SQL Editor over the course of the project. Consider formalizing into a `supabase/migrations` folder if this project continues past the retro.

Tables: `profiles`, `applications`, `application_documents` (unused — no upload UI yet), `students`, `parent_student`, `attendance`, `milestones`, `announcements`, `payments`, `feedback`, `activity_log`, `ref_counters`.

Enums: `user_role`, `account_status`, `application_status`, `document_type`, `document_status`, `attendance_status`, `milestone_category`, `payment_status`, `gender_type`.

RLS is enabled on every table. Parents can only see rows for their own linked students (via `parent_student`); teachers/admins have broader read/write per-table.

## Known temporary state / TODO

- `app/login/actions.ts` and `app/enroll/actions.ts` currently return raw Supabase/DB error messages to the client with a `DEBUG:` prefix (the intended generic message is commented out beside it). **Restore the generic message before this is used by real people** — don't extend the debug output further unless explicitly asked.
- `app/forgot-password/actions.ts` has the reset-link `redirectTo` **hardcoded to `http://localhost:3000`** rather than reading `process.env.NEXT_PUBLIC_SITE_URL`, because that env var was printing `undefined` server-side for an unresolved reason (possibly specific to the Antigravity-managed dev environment). Fine for now since all 4 retro PCs run their own localhost — but needs a real fix before any shared/deployed URL is involved.
- `/parent/enroll-a-student` needs a Server Action following the same pattern as `app/enroll/actions.ts` (student-only fields, insert into `applications`, but likely should pre-fill parent info from the logged-in user rather than collect it again).
- Document verification (`/admin/applications`) has no implementation yet — needs file upload (Supabase Storage bucket) before the review UI makes sense.

## Development workflow

There is no automated test suite, so "testing" here means verifying against the real running app rather than skipping straight from an error message to a guessed fix:

- **Before implementing a fix**: reproduce the actual problem first. Read the relevant file(s) in full rather than assuming based on the error text alone, check `npm run dev`'s terminal output for the real underlying error (Server Action errors, Supabase errors, etc. often get surfaced generically to the browser but print in full server-side), and confirm the root cause before editing anything. Several bugs in this project's history looked like one thing (e.g. "invalid credentials") and were actually another (an email typo, an RLS policy, a naming collision) — don't patch the symptom described without confirming the actual cause first.
- **Before implementing a new feature**: check the "Route status" table above and the actual files in the target route first — confirm whether something is a true placeholder or partially wired, so existing logic (e.g. an `actions.ts` pattern already established elsewhere) gets reused rather than re-invented differently.
- **After implementing**: run `npm run lint` and `npm run build` to catch type/lint errors before calling something done. For anything touching a Server Action, form, or auth flow, actually exercise it (submit the form, check the terminal/browser for errors) rather than treating a clean build as sufficient — this codebase has had multiple cases of code that type-checked fine but failed at runtime (RLS policies, env vars not loading, controlled vs. uncontrolled form inputs).
- If a fix is uncertain, prefer adding a temporary, clearly-labeled debug output (matching the existing `DEBUG:` prefix pattern already used in `app/login/actions.ts` and `app/enroll/actions.ts`) over guessing blind — but flag it for removal once resolved, per "Known temporary state" above.

Required (see `.env.local`, `lib/supabase/*`, `lib/email.ts`): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `BREVO_SMTP_USER`, `BREVO_SMTP_KEY`, `BREVO_SENDER_EMAIL`, `NEXT_PUBLIC_SITE_URL` (currently unreliable — see TODO above).

## Conventions

- Import alias `@/*` maps to the repo root (`tsconfig.json`).
- Tailwind v4 (via `@tailwindcss/postcss`), no `tailwind.config.*` file — configuration is CSS-based in `app/globals.css`.
- No database migrations are checked into the repo; schema (`profiles`, `applications`, etc.) lives in Supabase directly.
- Validation logic (name format, PH phone format, title-casing, parent-older-than-student age check) lives server-side in the relevant `actions.ts`, not just client-side — this project is being deliberately pen-tested (invalid inputs, symbols in names, boundary date values) as part of the coursework, so client-side checks alone are not sufficient anywhere user input reaches the database.
