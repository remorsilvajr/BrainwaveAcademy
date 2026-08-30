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
- **Requirements**: document upload checklist (Birth Certificate, 2x2 ID Photo, Proof of Address, Guardian Valid ID) for each of the parent's `applications` rows (looked up via `applications.created_parent_id`, not through a `students` record — see Architecture note on `application_documents` RLS). Uploads go to the private `documents` Supabase Storage bucket at `${applicationId}/${documentType}.${extension}`, `upsert: true` so re-uploading replaces the pending file. **Built** — see `app/parent/requirements/actions.ts`.
- All other parent pages (Announcement, Payments, Enrollment Status, Students) are intentionally empty placeholders for now.

### Teacher portal (`/teacher`)

Sidebar: Dashboard, Announcement, Students, Student Dashboard, My Profile, Settings, Log Out (Log Out wasn't in the original spec for teachers but was added for usability parity with the other two roles).

- **Dashboard**: Attendance, Milestones, Announcements, Pending Student Assessments.
- **Students**: list of all students with a "Show Student Record" action per row.
- **Student Dashboard** / **My Profile**: same shape as the parent versions, teacher-facing.

### Admin portal (`/admin`)

Sidebar: Dashboard, Announcement, User Management, Create New Account, **Enroll A Student**, **Applications**, Students, Student Dashboard, Settings, Log Out.

**"Enroll A Student" and "Applications" are two separate, easily-confused features — do not merge them:**

- **`/admin/enroll-a-student`** — reviews landing-page enrollment *requests* (rows in the `applications` table with `status = 'pending_review'`) and approves them. Approving: creates the parent's `auth.users` account + `profiles` row (or reuses an existing parent profile if this is a second child — matched by email, no duplicate account or email sent in that case), creates the `students` row, links them via `parent_student`, marks the application `approved`, and emails the parent a temp password. **This is fully built** — see `app/admin/enroll-a-student/actions.ts`.
- **`/admin/applications`** — a *separate, not-yet-built* document-verification **review** workflow (Birth Certificate, 2x2 ID Photos, Proof of Address, Guardian Valid ID — filters for Pending Document Review / Needs Correction / Approved Today). Currently a placeholder page only. The parent-facing **upload** side is built (`/parent/requirements`, see below) — admin just can't review what's been uploaded yet.
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
- `client.ts` — `createClient()` (sync) for Client Components only. **Must reference `process.env.NEXT_PUBLIC_X` directly and literally, never through a dynamic helper like `requireEnv(name)`.** Next.js only inlines a `NEXT_PUBLIC_` variable's real value into the browser bundle when it can statically see the exact variable name in source; a dynamic/bracket lookup (`process.env[name]`) defeats that detection, and the value silently comes back `undefined` in the browser even though the same variable works fine in server code. This caused a real outage (logout broke) when a shared `requireEnv()` validation helper — correct for server-side files — was mistakenly also applied here.
- `server.ts` — `createClient()` (async, must be `await`ed) for Server Components, Server Actions, and Route Handlers. Cookie writes are wrapped in try/catch because Server Components can't set cookies — the middleware's session refresh covers that case. Safe to use `requireEnv()` here since this runs in Node.js, where `process.env` is fully populated at runtime regardless of how it's accessed.
- `admin.ts` — `createAdminClient()` uses the Supabase **service role key** and bypasses Row Level Security entirely. Never import it into a Client Component; never expose `SUPABASE_SERVICE_ROLE_KEY` with a `NEXT_PUBLIC_` prefix. Currently only used in `app/admin/enroll-a-student/actions.ts` to create parent auth accounts. Also safe to use `requireEnv()` here (server-only).

**Env var validation**: `lib/env.ts` exports `requireEnv(name)`, which throws a clear `Missing required environment variable: X` error instead of an opaque downstream error. Use it in server-only code. Do not use it in `lib/supabase/client.ts` or any other browser-executed code — see above.

**Auth/mutation logic lives in `actions.ts` files colocated with their route** (e.g. `app/login/actions.ts`, `app/enroll/actions.ts`, `app/forgot-password/actions.ts`, `app/admin/enroll-a-student/actions.ts`), marked `'use server'`.

**Form state pattern**: forms that need field-level errors without losing typed input on failure use React's `useActionState`, not client-side validation + redirect. The Server Action returns `{ error?, fieldErrors?, values? }` — `values` echoes back exactly what was submitted so the form can repopulate itself via `defaultValue` even after a full round trip, and `fieldErrors` renders per-field. See `app/enroll/actions.ts` / `components/enroll/enrollment-form.tsx` as the reference implementation. **`<select>` elements must use controlled `value`/`onChange`, not `defaultValue`** — React re-applies a select's `defaultValue` on every re-render (unlike `<input>`, where it only applies once at mount), which caused dropdowns to silently reset on unrelated state changes.

**Email** goes through `lib/email.ts` (`sendEmail`), which uses `nodemailer` against Brevo's SMTP relay. This is separate from Supabase Auth's own emails (password reset, etc.), which are configured to use Brevo too, but via Supabase's dashboard SMTP settings, not this code path. (History: Resend was tried first but blocked — no domain the project controls DNS for; SendGrid/Twilio was blocked by a phone-verification wall; Brevo was the one that worked without either.)

**ID generation via SECURITY DEFINER triggers**: `profiles.account_id` (`PRT-YYYY-####` / `TCH-YYYY-####`) and `applications.application_ref` (`APP-YYYY-####`) are both generated by Postgres trigger functions (`generate_account_id()`, `generate_application_ref()`) backed by a shared `ref_counters` table keyed on `(prefix, year)`. `ref_counters` has RLS enabled with **zero policies on purpose** — nothing should touch it except these two trigger functions, which are marked `SECURITY DEFINER` with a fixed `search_path` specifically so they can write to it regardless of the calling role (anon visitor submitting the public enroll form, or a logged-in admin). If you ever see "new row violates row-level security policy for table ref_counters" again, the fix is on the trigger function side, not by adding a policy.

**`auth_role()` must stay `SECURITY DEFINER`.** It's a `public.auth_role()` SQL function (`select role from profiles where id = auth.uid()`) used inside several tables' own RLS policies (e.g. `profiles`' `admins_view_all_profiles`, `teachers_view_profiles`). It was originally created *without* `SECURITY DEFINER`, which caused infinite recursion — evaluating it re-triggers `profiles`' own RLS, which calls it again — surfacing as Postgres error `54001 stack depth limit exceeded` on completely unrelated queries (first found via `/parent/requirements`, whose policy subquery touched `profiles`). Fixed by recreating it with `SECURITY DEFINER SET search_path = public`, same reasoning as the `ref_counters` triggers above: a role-check helper called *from inside* RLS policies must bypass RLS itself when reading the one row it needs (`auth.uid()`'s own), or it's structurally guaranteed to recurse. If this ever gets "corrected" back to a plain function, the fix is the same as before.

**Storage RLS policies must be scoped `TO public` with an `auth.uid()`-based check, not `TO authenticated`.** Confirmed via extensive testing (Postgres catalog inspection, simulated `SET ROLE authenticated` inserts, a from-scratch comparison bucket, live production log inspection) that this project's actual Storage API requests — real uploads through the app, not the SQL Editor — do not reliably get evaluated as Postgres role `authenticated` for RLS purposes, even though the request's JWT correctly carries `role: authenticated` and the right `sub`. A `storage.objects` policy scoped `to authenticated` silently rejects every real upload ("new row violates row-level security policy") regardless of how trivially satisfiable its check is; the same check scoped `to public` works correctly. `auth.uid()` itself resolves fine over this same connection path (proven by the `/parent/requirements` fix working), so the pattern for any future storage policy is: `to public`, with the actual security boundary expressed entirely inside `with check`/`using`, e.g. `bucket_id = 'documents' and exists (select 1 from applications a where a.id::text = (storage.foldername(name))[1] and a.created_parent_id = auth.uid())` — see the `parents_upload_own_documents` / `parents_replace_own_documents` policies on `storage.objects`. Don't spend time re-litigating this via `TO authenticated` again; it's confirmed broken specifically in this project's environment, not a one-off fluke.

**`application_documents`'s parent-facing policies still have a latent bug**: `parents_insert_own_documents` / `parents_update_own_documents` / `parents_view_own_documents` check ownership via `exists (select 1 from students s join parent_student ps on ps.student_id = s.id where s.application_id = application_documents.application_id and ps.parent_id = auth.uid())` — but under the current architecture, no `students` row exists until *after* documents are approved (see `/admin/enroll-a-student`'s comment: student creation is deferred to `/admin/applications`), so that join can never match. This is currently masked by `anyone_can_upload_documents` (`with_check: true`, role `public`), an overly permissive policy that lets literally anyone insert `application_documents` rows regardless of ownership — permissive policies OR together, so it silently covers for the broken one. **Any future RLS policy on `application_documents` (or any other table touching pre-enrollment applicants) must key off `applications.created_parent_id = auth.uid()`, not `students`/`parent_student`**, since those don't exist yet at this stage. If `anyone_can_upload_documents` is ever tightened/removed, these three policies need rewriting first or uploads will silently break again.

## Route status (as of last working session)

| Route | Status |
|---|---|
| `/`, `/enroll`, `/login`, `/forgot-password`, `/reset-password` | Fully built and wired |
| `/admin/enroll-a-student` | Fully built (approve → account + student + email) |
| `/admin/applications` | Placeholder only — admin-side document *review* not built (parent-side upload is, see `/parent/requirements`) |
| `/parent/requirements` | Built (document upload to Storage + `application_documents`) |
| `/parent/settings` | Built (change password) |
| `/parent/enroll-a-student` | **Static shell only, not wired to a Server Action yet** |
| `/parent` dashboard, My Profile, Student Dashboard | Static shells with placeholder data |
| All other parent/teacher/admin pages not listed above | Static placeholder shells |

## Database

No migrations are checked into the repo — schema lives in Supabase directly, evolved via one-off SQL run manually in the Supabase SQL Editor over the course of the project. Consider formalizing into a `supabase/migrations` folder if this project continues past the retro.

Tables: `profiles`, `applications`, `application_documents` (parent uploads write here now, via `/parent/requirements` — admin review UI still not built), `students`, `parent_student`, `attendance`, `milestones`, `announcements`, `payments`, `feedback`, `activity_log`, `ref_counters`.

Enums: `user_role`, `account_status`, `application_status`, `document_type`, `document_status`, `attendance_status`, `milestone_category`, `payment_status`, `gender_type`.

RLS is enabled on every table. Parents can only see rows for their own linked students (via `parent_student`); teachers/admins have broader read/write per-table.

## Known temporary state / TODO

- `app/login/actions.ts` and `app/enroll/actions.ts` currently return raw Supabase/DB error messages to the client with a `DEBUG:` prefix (the intended generic message is commented out beside it). **Restore the generic message before this is used by real people** — don't extend the debug output further unless explicitly asked.
- `app/forgot-password/actions.ts` has the reset-link `redirectTo` **hardcoded to `http://localhost:3000`** rather than reading `process.env.NEXT_PUBLIC_SITE_URL`, because that env var was printing `undefined` server-side for an unresolved reason (possibly specific to the Antigravity-managed dev environment). Fine for now since all 4 retro PCs run their own localhost — but needs a real fix before any shared/deployed URL is involved.
- `/parent/enroll-a-student` needs a Server Action following the same pattern as `app/enroll/actions.ts` (student-only fields, insert into `applications`, but likely should pre-fill parent info from the logged-in user rather than collect it again).
- Document upload (`/parent/requirements`) is built; the admin-side review UI (`/admin/applications`) is not — it still needs to list uploaded `application_documents` rows and let admin set `verification_status`.
- `next.config.ts` sets `experimental.serverActions.bodySizeLimit` to `'10mb'` (Next's default is 1MB) so document uploads through Server Actions aren't rejected. Requires a real dev-server process restart to take effect — Next config isn't hot-reloaded.

## Development workflow

There is no automated test suite, so "testing" here means verifying against the real running app rather than skipping straight from an error message to a guessed fix:

- **Before implementing a fix**: reproduce the actual problem first. Read the relevant file(s) in full rather than assuming based on the error text alone, check `npm run dev`'s terminal output for the real underlying error (Server Action errors, Supabase errors, etc. often get surfaced generically to the browser but print in full server-side), and confirm the root cause before editing anything. Several bugs in this project's history looked like one thing (e.g. "invalid credentials") and were actually another (an email typo, an RLS policy, a naming collision) — don't patch the symptom described without confirming the actual cause first.
- **Before implementing a new feature**: check the "Route status" table above and the actual files in the target route first — confirm whether something is a true placeholder or partially wired, so existing logic (e.g. an `actions.ts` pattern already established elsewhere) gets reused rather than re-invented differently.
- **After implementing**: run `npm run lint` and `npm run build` to catch type/lint errors before calling something done. For anything touching a Server Action, form, or auth flow, actually exercise it (submit the form, check the terminal/browser for errors) rather than treating a clean build as sufficient — this codebase has had multiple cases of code that type-checked fine but failed at runtime (RLS policies, env vars not loading, controlled vs. uncontrolled form inputs).
- If a fix is uncertain, prefer adding a temporary, clearly-labeled debug output (matching the existing `DEBUG:` prefix pattern already used in `app/login/actions.ts` and `app/enroll/actions.ts`) over guessing blind — but flag it for removal once resolved, per "Known temporary state" above.



Required (see `.env.local`, `lib/supabase/*`, `lib/email.ts`): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `BREVO_SMTP_USER`, `BREVO_SMTP_KEY`, `BREVO_SENDER_EMAIL`, `NEXT_PUBLIC_SITE_URL` (currently unreliable — see TODO above).

Optional: `DATABASE_URL` — a direct Postgres connection string, not read by the app itself, only useful for one-off scripts/debugging (e.g. via the `pg` npm package). **Use the connection *pooler* string** (Supabase Dashboard → Project Settings → Database → Connection Pooling → "Transaction" mode, port 6543 — `postgresql://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:6543/postgres`), not the direct-connection host (`db.<ref>.supabase.co:5432`) — the direct host is IPv6-only and failed DNS resolution entirely from this dev environment.

## Conventions

- Import alias `@/*` maps to the repo root (`tsconfig.json`).
- Tailwind v4 (via `@tailwindcss/postcss`), no `tailwind.config.*` file — configuration is CSS-based in `app/globals.css`.
- No database migrations are checked into the repo; schema (`profiles`, `applications`, etc.) lives in Supabase directly.
- Validation logic (name format, PH phone format, title-casing, parent-older-than-student age check) lives server-side in the relevant `actions.ts`, not just client-side — this project is being deliberately pen-tested (invalid inputs, symbols in names, boundary date values) as part of the coursework, so client-side checks alone are not sufficient anywhere user input reaches the database.
