# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Project

Brainwave Preschool Academy — a Next.js (App Router) admin/enrollment portal backed by Supabase (Postgres + Auth). Three user roles — `admin`, `teacher`, `parent` — each with its own route section, sidebar nav, and dashboard. Public marketing site + enrollment form live outside auth; everything else is role-gated.

**Live deployment**: https://brainwave-academy-phi.vercel.app/ (Vercel). This is the real `NEXT_PUBLIC_SITE_URL` — must be set correctly in Vercel's own dashboard, separately from the `http://localhost:3000` value in local `.env.local`.

If the retro classroom has no/slow internet, see **`RETRO_OFFLINE_BACKUP.md`** — primary plan is USB-tethering a phone; secondary is a local Supabase environment (Docker + WSL2), proven working end-to-end on a dev machine but requiring the same setup to be repeated in advance on whichever lab PC is actually used.

This is a student capstone/school project. It needs to run identically when cloned onto any of 4 different PCs for a sprint retro (solved via a single shared cloud Supabase project + `.env.local`, not local Postgres).

## Keeping this file current

This file has gone stale before — route status and architecture notes drifting out of sync with the actual code. A stale doc actively misleads the next read, so treat updating it as part of finishing the work:

- **Route/feature status changes**: update the relevant `###` description _and_ the Route status table in the same session.
- **A real bug gets found and fixed** (not a typo — something a future session would otherwise re-discover the hard way): add a short note under the relevant section — the failure mode and the fix, not just "fixed X." Keep it to the rule/lesson, not a blow-by-blow of how it was found.
- **A convention or architectural decision changes**: update the note describing the old behavior rather than leaving it to contradict the code.
- Before adding a new note, check whether an existing one already covers the topic and needs editing instead of a duplicate.
- This applies whether the user explicitly asked for a CLAUDE.md update or not.

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

## Working from Figma references

The user drops per-page Figma exports into `public/images/pages/` as a reference when asking for a page to be built or reworked — ask for one if it would help and none has been provided. Treat these as reference, not spec:

- The designs predate many of this project's schema/convention changes and are often stale — cross-check against the real current schema/routes rather than trusting the image, and add fields the design is missing if the underlying data model already has them (e.g. `middle_name` isn't in most designs but every profile-editing surface treats it as real).
- Drop options/fields that don't correspond to anything real in the system (e.g. a role that doesn't exist in `user_role`) rather than inventing backing functionality for them, unless asked to actually add that capability.
- Figma canvases are a fixed, narrow width — don't reproduce that literally inside this app's much wider content area. Widen layouts, use multi-column arrangements, and place the result deliberately rather than defaulting to flush-left.
- Match this project's own established UI conventions (color tokens, spacing, the `useActionState` form pattern, card/section styling) over precisely matching the Figma's pixel styling.
- When something in the design is ambiguous or conflicts with how the system actually works now, ask rather than guessing silently.

## Product requirements

### Public site (unauthenticated)

- **Landing page** (`app/page.tsx`): school info from Figma. Header has About Us / Programs / 6 Domains anchor links (`#about-us`, `#programs`, `#domains`) plus Enroll/Log In buttons, visible at every width (not just `lg:` — mobile previously hid them inside the hamburger drawer, which buried the page's primary conversion actions). `components/landing/nav-items.ts` holds the shared `{label, href}` nav list as a plain (non-`'use client'`) module so both the client `SiteHeader` and server `SiteFooter` can import it — a `'use client'` module's exports all become client-only references when imported into a Server Component, so a shared constant that needs to cross that boundary needs its own plain file.
  - **Founder photo + 4 program-card photos render via `next/image`** (`fill` + `object-cover`), not raw `<img>`/CSS `background-image`, for responsive `srcset` + lazy-loading + AVIF/WebP. `ProgramPhoto` (in `academy-overview.tsx`) unmounts itself on `onError` so a missing local file renders as blank space instead of a broken-image icon (`next/image` 400s on a missing source, unlike a silently-blank CSS background).
  - **`SiteHeader` is auth-aware.** Takes an optional `auth: PortalAuth` prop (`{ role, firstName, lastName, avatarUrl } | null` from `lib/get-portal-auth.ts`'s `getPortalAuth()`), fetched server-side by `app/page.tsx`, `/privacy-policy`, `/terms-of-service` (not `/login` — middleware always redirects a logged-in user away before it renders). Logged in: **Enroll** (parent only, → `/parent/enroll-a-student`), a **Portal** button (`/${role}`), and `components/ui/profile-menu.tsx`'s `ProfileMenu` (My Profile / Settings / Log Out / Report a Bug — `myProfileHref` omitted for `admin`, no self-service profile page). `ProfileMenu` is shared, not landing-specific — also backs the clickable profile icon in `ParentTopBar`/`TeacherTopBar`/`AdminTopBar` (takes trigger content as `children`, owns its own open/close + click-away + panel positioning, closes itself on pathname change since a `<Link>` nav doesn't trigger click-away backdrops).
- **Enroll** (`/enroll`): public form, no auth. Student: First/Middle/Last Name, DOB, Gender. Parent/Guardian: First/Middle/Last Name, DOB, Relationship, Contact Number, Email (+ a conditional Gender select when Relationship is "Guardian" — see the parent-gender note under Conventions). Submits into `applications` (anon insert via RLS). No account is created at this step — admin reviews and emails credentials on approval.
  - Has a honeypot field (`website`, visually hidden, `tabIndex={-1}`) — a filled honeypot silently redirects to the same thank-you page with nothing written, so a bot gets no signal to adapt. Not a substitute for a real CAPTCHA; Supabase Auth supports Turnstile/hCaptcha natively but needs a third-party site key the user would have to create.
  - Requires an explicit consent checkbox ("I have read and agree to Privacy Policy / Terms... and consent to the processing of the information above") validated server-side, not just client `required`. `/parent/enroll-a-student` gets a lighter, non-blocking version (just a link) since that parent already has an account relationship with the School.
- **Login** (`/login`): email + password, Forgot-password link. **Forgot password** (`/forgot-password` → `/auth/confirm` → `/reset-password`).
- **Privacy Policy** / **Terms of Service**: real, specific content (actual data categories collected, actual third parties — Supabase/Vercel/Brevo/Postmark), referencing RA 10173 and the National Privacy Commission (school operates in the Philippines). Contact address is currently `rsilva1@addu.edu.ph`, marked on-page as a temporary stand-in until the School has its own — swap once a real address exists.
  - **Cookie consent** (`CookieConsentBanner`) is notice-and-acknowledge, not accept/reject — every cookie this app sets is strictly necessary (auth, role/status caching, presence), so there's nothing to meaningfully gate. Built on `useSyncExternalStore`, not `useState`+`useEffect` — the latter both trips this repo's `react-hooks/set-state-in-effect` lint rule and isn't hydration-safe (`localStorage` doesn't exist during SSR). Reuse this same shape for any future browser-only-storage-driven initial render.
- **`app/enroll/thank-you`**, **`app/faq`**, **`app/not-found.tsx`**, **`components/ui/breadcrumbs.tsx`**: SEO/launch-checklist basics — dedicated `noindex` confirmation page, a real FAQ page + JSON-LD, a branded 404, and a shared breadcrumb component (visible trail + `BreadcrumbList` JSON-LD from one `items` array). `app/opengraph-image.tsx` generates a fallback OG image via `next/og`. Deliberately skipped (needs real input this repo doesn't have): maps/address schema, real reviews/case studies, a response-time promise, a team photo, Google Analytics (ask for a GA4 ID first).

### Parent portal (`/parent`)

Sidebar: Dashboard, Announcement, **Enrollment** (Enroll A Student, Requirements, Payments, Enrollment Status), **Student** (Students, Student Dashboard), **Account** (My Profile, Settings, Log Out).

- **Dashboard**: welcome banner, enrollment progress, due balance (hardcoded ₱0.00 — no `payments` UI yet), recent announcements.
- **Enroll A Student** (`components/parent/enroll-student-form.tsx` / `app/parent/enroll-a-student/actions.ts`): same student fields as the public form, minus parent info (pulled server-side from the logged-in parent's own `profiles` row). Inserts a normal `pending_review` `applications` row — goes through the same admin review queue as the public form, so its "match existing parent by email" logic naturally reuses the account. Requires the parent's profile to already have phone/DOB/relationship filled in.
- **My Profile**: Full Name + Email locked; Phone/DOB/Relationship editable. Shows Account ID (`PRT-YYYY-####`) and status. Avatar upload uses a deferred-until-Save pattern (`pendingPhoto`/`photoPreview`/`removePending` — a removal is staged too, not just a new photo, so Cancel can back out of either). Same pattern in Teacher's My Profile.
- **Student Dashboard** (read-only): attendance, milestone tracker, uses the shared `?student=` param. If the selected application has no `created_student_id` yet, shows an empty state instead of querying `attendance`/`milestones`. Reuses `components/teacher/student-dashboard-content.tsx` with `readOnly` (teacher/admin use the same component to edit).
- **Requirements**: document upload checklist (Birth Certificate, 2x2 ID Photo, Proof of Address, Guardian Valid ID) per `applications` row (via `created_parent_id`, not `students`). Uploads go to the private `documents` bucket at `${applicationId}/${documentType}.${extension}`, `upsert: true`. The 2x2 ID Photo doubles as the student's avatar once `created_student_id` exists (copied into the public `avatars` bucket, sets `students.avatar_url`).
  - Empty states use the shared `components/ui/empty-state.tsx` (`EmptyState`: `icon`, `title`, `description`, optional `action`/`secondaryAction`, `tone: 'neutral'|'warning'|'error'`) — used everywhere in the app a page-level "nothing here yet" state is needed (Requirements, Enrollment Status, Enrollment Profile/Students, both Student Dashboards). Requirements specifically branches three ways depending on why no document record exists yet: no application at all (neutral, CTA to Enroll A Student), a still-pending enrollment request (`warning`, CTA to Enrollment Status), or a rejected one (`error`, CTA to resubmit) — don't collapse "pending" and "rejected" into one state; they need different copy and CTAs.
- **Enrollment Profile** (`/parent/students`, sidebar label — route/heading still say "students"/"Applicant Profile"/"Student Profile" depending on state): read-only enrollment record + an editable profile photo once a real `students` row exists (immediate upload, no deferred step — `app/parent/students/actions.ts`).
- **Enrollment Status** (`/parent/enrollment-status`): step tracker (Submitted → Approved → Documents Under Review → Enrolled), or a rejection card with the admin's `review_notes` and a **"Remove This Application"** control.
  - Removing only sets `applications.hidden_from_parent = true` — never deletes the row. Every parent-facing `applications` query filters `hidden_from_parent = false` (extracted into `lib/parent-applications.ts`'s `parentApplicationsFilter(user)`); admin's own queries are unaffected. Shown on both Enrollment Status and Enrollment Profile once `status === 'rejected'`.
  - **RLS for this has to key off `parent_email`, not `created_parent_id`** — a rejected application never gets `created_parent_id` set. `parents_hide_own_rejected_applications` resolves the caller's own email via `auth_email()`, a `SECURITY DEFINER` helper mirroring `auth_role()` (see the RLS section below). A `before update` trigger locks every other column so this UPDATE right can't be used to rewrite anything besides `hidden_from_parent`.
  - Deliberately doesn't call `redirect()` inside the action (invoked directly, not via a form) — navigates client-side via `router.push`/`router.refresh()` instead (see the Server Action/middleware note below for why).

### Teacher portal (`/teacher`)

Sidebar: Dashboard, Announcement, Students, Student Dashboard, My Profile, Settings, Log Out. **Fully built.**

No classroom/section or teacher-student-assignment concept exists anywhere in the schema — `teachers_manage_attendance`/`teachers_manage_milestones`/`teachers_view_students` RLS is all unscoped (`auth_role() = 'teacher'`, full table access), so every teacher sees every student system-wide. Don't reintroduce a "Health Flags"/classroom-assignment UI (both were in early Figma, both dropped) without first adding real backing schema.

- **Dashboard**: attendance summary + interactive roster check-in, milestones summary, "Classroom Announcements" (posts `target_role: 'parent'`), "Pending Student Assessments" (`X/6` domains per student, links into Student Dashboard).
- **Student Dashboard**: per-student attendance + a 6-domain milestone tracker (free-text note + date per domain). `StudentSelector` is a searchable combobox (button + dropdown + search input), not a native `<select>` — needed once the student list could realistically grow past a handful. Shared by `/teacher/student-dashboard` and `/admin/student-dashboard`.
  - **Any dropdown/panel anchored to a trigger inside a `flex-wrap` row needs `left-0 sm:left-auto sm:right-0`, not a bare `right-0`.** `justify-content` on a wrapped flex row is per-line — once a lone trigger wraps to its own line, it lands at the far left, and a `right-0`-anchored panel then renders off-screen to the left. Hit and fixed in `ParentTopBar`'s child switcher and `StudentSelector`; check for the same shape in any future dropdown living inside a row that can wrap.
- The mobile off-canvas sidebar drawer locks `document.body.style.overflow = 'hidden'` while open (a legitimate `useEffect` — synchronizing with the DOM `body`, not React state), so the page behind it can't scroll while the drawer is up.
- **My Profile**: same shape as parent's, with `gender` instead of `relationship_to_student`. **Settings**: same shape as parent's (shared `session-management.tsx`; notification prefs are route-coupled, own actions file).
- **Milestone assessments are edit-in-place** (`submitMilestoneAssessment` updates the existing `(student_id, category)` row if one exists, else inserts — uses `.order().limit(1)`, not `.maybeSingle()`, so legacy duplicate rows don't throw). Same reasoning applies to `recordAttendance`'s `(student_id, date)` lookup.
  - Clearing the notes to empty **deletes** the assessment row (no separate "Remove" button/confirm step) — `StudentDashboardContent`'s form shows a hint and swaps its Submit label to red "Remove Assessment" when the textarea is empty and a record exists. Teacher and admin both get this (shared component/RLS); parent stays `readOnly`.
- **"Today" must go through `todayIso()`/`isToday()`/`manilaHour()` in `lib/format.ts`, never a bare `new Date()`.** The school is always Asia/Manila (UTC+8, no DST) but the server process isn't guaranteed to be — these three helpers use `Intl.DateTimeFormat` with an explicit `timeZone` so "today" is correct regardless of runtime timezone. Reuse them for any new "what's today"/"what hour is it" check.
- **Attendance is date-selectable** (`RosterCheckin`/`DateSelector`, shared by `/teacher/attendance` and `/admin/attendance`). A non-today date makes `/teacher/attendance` read-only (teachers can't retroactively edit); `/admin/attendance` is always editable.
- `StudentDashboardContent` is shared across all three roles' Student Dashboard pages — an optional `avatarEditor` prop (bound Server Actions) turns the header avatar into an upload control (admin only), and an optional `readOnly` prop (default `false`) hides all write controls (parent only).

### Admin portal (`/admin`)

Sidebar: Dashboard, Announcement, User Management, Create New Account, Enrollment Requests, Applications, Students, Attendance, Student Dashboard, Teachers, Activity Log, Feedback, (Deleted Items — super admin only), Settings, Log Out. Admin has no self-service My Profile — User Management already covers editing any account.

**"Enrollment Requests" (`/admin/enroll-a-student`) and "Applications" (`/admin/applications`) are two separate, easily-confused steps — do not merge them:**

- **Enrollment Requests**: reviews landing-page/parent-portal enrollment _requests_ (`applications` rows, `status = 'pending_review'`). Approving creates the parent's `auth.users` account + `profiles` row (or reuses an existing parent profile matched by email for a second child — no duplicate account/email), marks the application `approved`, emails a temp password. **This step never creates a `students` row** — that only happens in Applications.
  - Rejecting requires a non-empty `reason`, saved into `review_notes` and shown back to the parent on Enrollment Status.
  - A handled request (approved or rejected) can be archived (`applications.archived`) to declutter the default tabs, without changing its status — reversible, no confirm step.
- **Applications**: the document-verification review workflow (Birth Certificate, 2x2 ID Photo, Proof of Address, Guardian Valid ID) for already-approved requests. Per-document Valid/Needs Correction toggle (styled pill buttons, not native radios — native radio hover rendering has browser-dependent subpixel variance). **Request Corrections** (disabled unless ≥1 document is flagged; confirms via `ConfirmDialog` before emailing the parent) or, once all 4 are Valid, **Approve & Create Student Record** — this is the step that actually creates the `students` row + `parent_student` link.
- **Dashboard**: Pending Applications, Active Student Enrollment, and Unresolved Feedback (with Resolve) are real queries. Total Collections Today / Recent Financial Transactions render an honest empty state — no `payments` table yet, never fabricate data here.
- **Bug reports / feedback**: any logged-in user can submit one via `ProfileMenu`'s "Report a Bug" → `BugReportModal` → `feedback` table (ordinary RLS-scoped client). Optional screenshot upload to the private `bug-reports` bucket — the storage path is always derived server-side (`${user.id}/${randomUUID()}.${ext}`), never taken from the client. `/admin/feedback` is the full searchable/paginated inbox (Unresolved/Resolved/All tabs); the bucket has no SELECT policy — only admin can read a screenshot back, via a signed URL from `createAdminClient()` after `requireAdmin()`.
- **User Management**: filters, list, Edit (name/phone/DOB/gender/role/status + avatar) and Block, all wired. For a parent, the Edit modal shows separate "Enrolled Students" and "Applicants" lists (see the Applicant/Student terminology note below).
  - **Super admin**: a `profiles.is_super_admin` flag on top of the ordinary `admin` role (not a separate `user_role` enum value — deliberately, so every existing `auth_role() = 'admin'` RLS policy and every UI surface treats a super admin exactly like any other admin, no separate auditing needed). Permission rule lives in one place, `lib/permissions.ts`'s `canModerateAccount(actor, target)`: a super admin can never be blocked or deleted by anyone; a regular admin can't block/delete any `role = 'admin'` account at all. Enforced server-side in `toggleBlockUser`/`deleteUserAccount`/`updateUserProfile`, not just hidden in the UI.
    - **The tier must never be discoverable by a regular admin anywhere in the UI** — no badge, tooltip, or confirmation copy may name it. A regular admin can only observe that some admin rows are "Protected," never why. The one residual gap: the bootstrap account's own email is still visible in User Management like anyone else's (the user chose that address themselves) — don't "fix" this without being asked.
    - No UI promotes/demotes `is_super_admin` — the one bootstrap account was created via a one-off local script against the service-role client, not checked into the repo. If another super admin is ever needed, do the same rather than adding a checkbox anywhere.
  - **Blocking ends access immediately, not just at next login**: `toggleBlockUser` sets a real Supabase Auth ban (`ban_duration: '876000h'`) in addition to flipping `profiles.account_status` — this is the actual enforcement; `middleware.ts` also re-checks `account_status` per-request (cached 5 min) as a backup layer only.
  - **"Online" status** is a heuristic (`profiles.last_seen_at`, pinged by middleware, throttled ~60s via a cookie; "online" = seen within 5 min) — not real presence. `last_seen_at` is cleared on every session-ending action (logout, force-logout, block) so the dot doesn't stay stale-green. `login()` also proactively sets `account_status`/`presence_ping`/`last_seen_at` itself (not just middleware reactively) — any future per-user cached-cookie state middleware sets reactively needs the same proactive set at login, or a shared browser inherits the previous occupant's stale cookie.
  - **"Log Out"** (`forceLogoutUser`) reuses the ban mechanism but briefly (`'15s'`) — there's no per-session revoke in Supabase's admin API, only account-wide bans.
- **Students** / **Teachers**: directory + modal (Personal Details, Guardian Info/Documents for Students; just Personal Details for Teachers) with avatar upload. Teachers deliberately doesn't touch `role`/`account_status` — that stays User Management's job.
- **Student Dashboard**: mirrors `/teacher/student-dashboard` plus an avatar editor (admin has full edit rights). Branches on whether `?student=` is present so the default-selection case (which needs the student list first) doesn't serialize an unnecessary round trip on the common `?student=`-supplied case.
- **Create New Account**: photo, name/email/phone, role select with role-conditional fields, auto-generate (email) or manual password (show/hide toggle), duplicate-email check, rolls back the auth user if the `profiles` insert fails.
- **`/admin/settings`**: password change only. **`/admin/logs`** ("Activity Log"): read-only `activity_log` viewer, joins `profiles` for the actor and resolves a human-readable `targetLabel` per `target_table` (profiles/students/applications) instead of showing a raw UUID; a Details modal shows the full picture (actor email, resolved + raw target, exact timestamp).
- **Delete/Restore**: any account or enrollment request can be soft-deleted (`deleted_at`, never a real delete) by an admin (subject to the same `canModerateAccount` rule for accounts); deleting an account also bans it. **`/admin/deleted-items`** is super-admin-only to _view_ (any admin can still delete) — the page re-checks `is_super_admin` server-side and redirects a regular admin, since middleware only does broad role-based routing, not this finer split. Restoring an account re-derives its ban state from its current `account_status` rather than unconditionally lifting it (a blocked-then-deleted account stays blocked after restore).

### Activity logging

`lib/activity-log.ts`'s `logActivity(supabase, { actorId, action, targetTable?, targetId? })` is a best-effort audit insert (wrapped in try/catch, never blocks the mutation it describes) — wired into essentially every real mutation across the app. `actorId` is `null` for anonymous actions (public `/enroll`). If you add a new mutation, wire it in the same way, right before (or on early-return paths, instead of) the existing `revalidatePath` calls.

**A `logActivity` call from a Client Component must be `await`ed**, not fire-and-forget — an un-awaited call can be cancelled by a fast subsequent navigation (confirmed: `ChangePasswordForm` originally lost roughly every other log entry this way).

### Search + pagination

Every list-shaped page (User Management, Students, Applications, Enrollment Requests, Activity Log, Announcements, Attendance roster) shares one pattern via `components/ui/pagination.tsx` + `lib/use-pagination.ts`:

- `usePagination(items, resetKey, pageSize = 10)` — takes the already-filtered array, slices to `pageItems`. `resetKey` should be every search/filter input concatenated, so a new search snaps back to page 1 instead of landing on a stale page number. The reset happens inline during render (React's "adjusting state when a prop changes" pattern), not in a `useEffect`.
- `<Pagination page totalPages totalItems pageSize onPageChange />` — Prev/Next, collapsed page numbers, a "Go to page" input. Renders nothing at ≤1 page.

**Every paginated list's results container needs a reserved `min-h` (`420px`, or `360px` for card-style lists).** Without one, typing into the search box on every keystroke (no debounce) visibly collapses the whole page and snaps scroll position upward as the result count shrinks. Two dashboard-embedded widgets (capped, no search box) are deliberately exempt.

### Sidebar navigation feedback

Every route is a fully server-rendered page that runs its own Supabase queries before rendering — clicking a sidebar link with nothing else in place just freezes the previous page on screen. Fixed by two pieces together:

- **`app/<role>/loading.tsx`** (each just `<PageSkeleton />`) — per Next's `loading.js` convention, wraps `page.tsx` and every nested route below it in one Suspense boundary. The role layouts render `<Sidebar>`/topbar outside `{children}`, so those stay interactive throughout.
- **`TopProgressBar`** in `components/sidebar.tsx` — driven by a real `useTransition()` wrapping `router.push()`, not `next/link`'s `useLinkStatus()` (that hook's `pending` window closes almost immediately, before the destination's data is actually ready — invisible in practice). `handleLinkClick` calls `e.preventDefault()` so it can drive the push itself; modified clicks (ctrl/cmd/shift/alt/middle) pass through untouched.

**This only fully demonstrates against a production build (`next build && next start`), not `next dev`** — dev disables aggressive prefetching and blocks navigation differently. Don't conclude the pattern is broken from a `next dev` observation alone.

**Role-based routing is middleware-only, not layout guards** (`middleware.ts`): unauthenticated → `/login`; wrong-role → `/${role}`. `publicOnlyPaths` (signed-out-only) is `['/login', '/enroll', '/forgot-password']` — `/` is deliberately not in this list, so a logged-in user can browse back to the landing page and see the auth-aware header.

**Middleware must not run its redirect logic against a Server Action request.** A Server Action POST carries a `Next-Action` header and expects Next's action-response envelope back, not a raw HTTP redirect — a stale tab (logged in elsewhere, shared cookies) submitting a form after middleware would now redirect it crashes the client with "An unexpected response was received from the server." Fixed by checking `request.headers.has('next-action')` and returning `supabaseResponse` immediately for any such request, skipping every pathname-based redirect (the invoked action's own auth checks / RLS still apply). This isn't login-specific — any Server Action whose page's auth-relevant state changed since render can hit this.

**Any per-request middleware check gated by a short-TTL cookie should ask first whether it needs to run synchronously** (does it decide a redirect on *this* request?) — if not, use `event.waitUntil()` rather than `await`ing it. `presence_ping`'s write doesn't gate anything and was needlessly blocking every navigation once its cookie expired; moved off the critical path this way. `account_status`'s check does gate a redirect and stays synchronous, but its TTL was widened from 60s to 5min since the real enforcement is the Auth `ban_duration` above it, not this cookie.

**Multi-tab sessions go stale without an active nudge** — a tab that's already rendered doesn't know another tab logged out or switched accounts, since cookies don't push change notifications. `components/cross-tab-auth-sync.tsx` (mounted once in root layout) calls `router.refresh()` on `visibilitychange`, so switching back to a stale tab re-runs Server Components + middleware against whatever the cookies currently say.

**Data-exposure/security-header basics**: `next.config.ts` sets `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy` (denies camera/mic/geolocation — unused), and HSTS. `app/robots.ts` disallows the three portal paths; `app/sitemap.ts` lists only real public pages. A real `Content-Security-Policy` is still open — needs testing against every inline script (theme-init, Analytics) before it's safe to add.

### Supabase client selection (`lib/supabase/`)

- **`client.ts`** — `createClient()` (sync), Client Components only. **Must reference `process.env.NEXT_PUBLIC_X` directly and literally, never through a dynamic helper** (`process.env[name]`) — Next only inlines a `NEXT_PUBLIC_` var into the browser bundle when it can statically see the exact name in source; a dynamic lookup silently comes back `undefined` client-side even though the same variable works fine server-side. (Caused a real outage when a shared `requireEnv()` helper was mistakenly applied here.)
- **`server.ts`** — `createClient()` (async, must be `await`ed), Server Components/Actions/Route Handlers. Cookie writes are wrapped in try/catch (Server Components can't set cookies; middleware's session refresh covers it). Safe to use `requireEnv()` here.
- **`admin.ts`** — `createAdminClient()` uses the service role key, bypasses RLS entirely. Never import into a Client Component. **Every Server Action that uses it must call `lib/require-admin.ts`'s `requireAdmin()` (or an equivalent ownership check) as its very first line** — middleware explicitly skips Server Action requests (see above), so nothing else gates a directly-invoked action, and for an admin-client action RLS provides zero protection either. (Three actions were missing this and fixed: `createSystemUser`, `approveApplication`, `getSignedDocumentUrl`.)

`lib/env.ts`'s `requireEnv(name)` throws a clear error for a missing var — use in server-only code, never in `lib/supabase/client.ts` or other browser-executed code.

### Auth cookies, sessions, and RLS security model

- Auth/mutation logic lives in `actions.ts` files colocated with their route, marked `'use server'`.
- **"Remember me"** is tracked via a `remember_me` cookie set before `signInWithPassword()`. `lib/supabase/remember-me.ts`'s `applyRememberMe` strips `maxAge`/`expires` off `sb-*` cookies when unchecked — this must run in both `server.ts`'s and `middleware.ts`'s `setAll` (a token refresh re-issues cookies with Supabase's own long-lived defaults, not just at login), and **must early-return unchanged whenever the library is deleting a cookie** (`value === ''` or `maxAge <= 0`) — treating a deletion as "keep it, but session-scoped" silently broke `signOut()` for any not-remembered session.
- Every cookie this app sets carries `secure` in production (`NODE_ENV`-conditional — unconditional would break local `http://` dev).
- **Form state pattern**: forms needing field-level errors without losing typed input use `useActionState`, returning `{ error?, fieldErrors?, values? }` — `values` echoes back what was submitted so the form repopulates via `defaultValue` after a round trip. **`<select>` elements must use controlled `value`/`onChange`, not `defaultValue`** — React re-applies a select's `defaultValue` on every re-render (unlike `<input>`), which silently resets dropdowns on unrelated state changes.
- **ID generation** (`profiles.account_id`, `applications.application_ref`) is via `SECURITY DEFINER` trigger functions writing to `ref_counters`, which has RLS enabled with zero policies on purpose — don't add a policy if this ever errors; fix the trigger function instead.
- **`auth_role()`/`auth_email()` must stay `SECURITY DEFINER`** — a role/email-lookup helper called from inside another table's RLS policy must bypass that table's own RLS when reading the caller's own row, or it recurses (`54001 stack depth limit exceeded`).
- **RLS restricts rows, not columns — any policy without an explicit `WITH CHECK` (or one that only re-checks ownership) lets the caller rewrite *any* column on a row they own, not just the one the app's own UI exposes.** This was found as a real, unexploited privilege-escalation gap on `profiles` (any authenticated user could self-grant `role: admin`) and, in the same audit, on `application_documents`, `students`, and `applications` (a parent could rewrite fields the app's own actions never touch). The fix pattern used throughout: a `before update` trigger comparing `to_jsonb(new) - 'allowed_col'` against `to_jsonb(old) - 'allowed_col'` and raising on any other change — prefer this over enumerating every other column in a `WITH CHECK` subquery (self-maintaining if a column is added later, and a trigger function isn't RPC-exposable the way a `SECURITY DEFINER` helper referenced from a policy's `WITH CHECK` can be — see the next point). Also fixed in the same pass: a stray fully-open `anyone_can_upload_documents` policy that made a properly-scoped sibling policy meaningless (permissive RLS policies OR together), and two field-spoofing gaps (`announcements.posted_by`, `activity_log.actor_id` not pinned to the caller).
- **A `SECURITY DEFINER` helper referenced from an RLS policy needs `EXECUTE` granted to whichever role evaluates that policy — which also makes it directly callable as a public RPC endpoint, whether intended or not.** `stored_profile_privileges(target_id)` (added for the `profiles` fix above) initially returned any account's privileged fields for any caller once called directly as an RPC. Fixed by making the function self-defend (`... where id = target_id and (target_id = auth.uid() or auth_role() = 'admin')`), not by touching the grant. Any future helper in this shape needs the same self-check — never assume grants alone gate it.
- **Storage RLS policies must be scoped `to public` with an `auth.uid()`-based check, not `to authenticated`.** Confirmed via extensive testing that this project's real Storage API requests aren't reliably evaluated as Postgres role `authenticated` for RLS purposes even though the JWT is correct — a `to authenticated` policy silently rejects real uploads. Don't re-litigate this.
- **A bucket using per-command policies (not `for ALL`) and `.upload(..., { upsert: true })` needs an explicit SELECT policy too** — `upsert` does an internal existence check that's itself subject to RLS, which silently fails without one even though the INSERT policy alone would permit the write.
- Storage buckets should always set `allowed_mime_types`/`file_size_limit` at the bucket level (`string_to_array('a,b', ',')`, not `ARRAY['a','b']` — the bracket-literal form has caused real copy-paste syntax errors in the Supabase SQL Editor that silently rolled back an entire unrelated multi-statement submission bundled with it) — a client-side `accept`/size guard is UX only, never the real boundary.
- **Every schema/RLS change is run manually by the user in the Supabase SQL Editor — Claude never runs one directly**, and **never assume a change landed just because the user says "done" — always re-verify against `pg_policy`/`pg_proc`/`pg_trigger` (read-only) afterward.** A real incident: a syntax error in one bundled statement silently rolled back an entire unrelated critical RLS fix bundled in the same submission, caught only by re-querying afterward. Give unrelated fixes as separate, independently-runnable SQL blocks for this reason.

### Announcements

`announcements.target_role` is free-text (`parent`/`teacher`/`all` by convention, not DB-enforced or RLS-filtered — each page's own query restricts what it shows). Teacher can only INSERT, always `target_role: 'parent'`. Admin (`ALL`) can post to any target and delete any announcement. Parent has no INSERT policy — read-only. Byline names work for every role via a dedicated `view_announcement_posters` policy on `profiles` (without it, a parent viewing a teacher's/admin's byline would see "by Staff", since `profiles`' ordinary read policies don't cover cross-role reads).

### Profile photos

`components/ui/avatar-editor.tsx`'s `AvatarEditor` is the one shared, purely-presentational control (camera + optional trash button) used everywhere a photo changes. Takes `onFileSelected`/`onRemove` callbacks and has no opinion on immediate-vs-deferred upload or storage path — that's each caller's job. Path convention: `avatars/${userId}/avatar.${ext}` for an account's own photo, `avatars/student-${studentId}/avatar.${ext}` for a student's.

- **Rejects a file over 2MB client-side.** Vercel's serverless functions cap request bodies at 4.5MB regardless of this repo's own `bodySizeLimit` config — an oversized upload (especially an uncompressed format like BMP) sails past every other check and fails at the platform layer as a generic, unhelpful framework error, not a catchable one. 2MB also matches the `avatars` bucket's own `file_size_limit`.
- **Validate all other fields before touching the avatar upload/remove call** — each commits immediately with no rollback, so a later validation failure (e.g. an invalid phone number) must not leave an already-changed photo committed while reporting the whole save as failed.

### Modals & confirmations

Every admin record editor/reviewer is a centered modal via the shared `components/ui/modal.tsx`'s `Modal` (`onClose`, `maxWidth`, `children`) — it only owns the outer frame; each caller keeps its own internal header/tabs/scrollable-body/footer. A nested single-document preview (`DocumentPreviewModal`) renders as its own sibling `fixed inset-0` overlay at a higher `z-[60]` on top.

`components/ui/document-preview-modal.tsx`'s `DocumentPreviewModal` renders a signed URL inline (`<img>` for images, `<iframe>` for PDFs, told apart by checking for a `.pdf` extension before the URL's `?token=` query) with an "Open in new tab" escape hatch — not `window.open()` as the primary interaction.

**Any real, consequential action (mutates data, even reversibly) gets proper button styling — an outlined or solid pill matching the row's convention, not a bare underlined text link.** A bare text link is fine only for pure navigation/dismissal with no state change of its own (Cancel, View Document, View All).

**Any confirmation for a real, consequential action (block, delete, remove, request-corrections-that-emails-someone) uses `components/ui/confirm-dialog.tsx`'s `ConfirmDialog`** (tone-colored icon, bold title, a description naming the specific record by name/reference, Cancel/Confirm buttons) — not a bare inline "Are you sure? Cancel / Yes" crammed into a table cell. A small inline confirm is still fine for something genuinely low-stakes and fully reversible (Unblock, Unarchive). **Confirmation copy states what will happen, in one direct sentence, and stops** — no reassurance ("don't worry, nothing is erased"), no explaining what won't happen, no follow-up instructions unless genuinely needed to undo it.

## Route status (as of last working session)

| Route | Status |
| --- | --- |
| `/`, `/enroll`, `/login`, `/forgot-password`, `/reset-password`, `/enroll/thank-you`, `/faq`, `/privacy-policy`, `/terms-of-service` | Fully built and wired |
| `/admin/enroll-a-student` ("Enrollment Requests") | Fully built (approve → account + student + email) |
| `/admin/applications` | Fully built (document review, Request Corrections, Approve & Create Student Record) |
| `/admin/create-new-account` | Fully built |
| `/admin/settings` | Fully built (password change only) |
| `/admin/logs` | Fully built (read-only `activity_log` viewer) |
| `/admin/feedback` | Fully built |
| `/admin` dashboard | Pending Applications, Active Student Enrollment, Unresolved Feedback are real; Total Collections Today + Recent Financial Transactions render an honest empty state (`payments` not built yet) |
| `/parent/requirements`, `/parent/settings`, `/parent/enroll-a-student`, `/parent/my-profile`, `/parent/enrollment-status` | Fully built |
| `/parent` dashboard | Enrollment Progress + Announcements preview are real; Due Balance is hardcoded ₱0.00 |
| `/parent/announcement`, `/teacher/announcement`, `/admin/announcement` | Fully built |
| `/parent/student-dashboard` | Fully built, read-only |
| `/teacher/*` (all routes) | Fully built |
| `/admin/user-management`, `/admin/students`, `/admin/teachers`, `/admin/student-dashboard`, `/admin/attendance` | Fully built |
| `/admin/deleted-items` | Fully built, super-admin-only to view |
| All other parent/admin pages not listed above | Static placeholder shells |

## Database

No migrations are checked into the repo — schema lives in Supabase directly, evolved via one-off SQL run manually in the Supabase SQL Editor. Consider formalizing into a `supabase/migrations` folder if this project continues past the retro.

Tables: `profiles`, `applications`, `application_documents`, `students`, `parent_student`, `attendance`, `milestones`, `announcements`, `payments`, `feedback`, `activity_log`, `ref_counters`.

Enums: `user_role`, `account_status`, `application_status`, `document_type`, `document_status`, `attendance_status`, `milestone_category`, `payment_status`, `gender_type`.

RLS is enabled on every table. Parents see only their own linked students (via `parent_student`); teachers/admins have broader read/write per-table.

## Known temporary state / TODO

- **Privacy Policy/Terms contact address** (`rsilva1@addu.edu.ph`) is a marked stand-in until the School has its own official email — swap and drop the on-page note once one exists.
- **A real CAPTCHA** (Cloudflare Turnstile) on `/enroll` and `/login` is still open — needs the user to create a Turnstile account/site key first. The honeypot is a stand-in until then.
- **A real Content-Security-Policy header** is still open — needs testing against every inline script (theme-init, Analytics) before it's safe to ship.
- **`user-management-table.tsx` receives the raw `is_super_admin` boolean as a prop** (to compute `canModerateAccount` client-side for button visibility), which means it's technically present in that page's RSC payload — a real if low-severity gap against "the super admin tier must never be discoverable." Clean fix is to compute `canModerate: boolean` server-side per row and pass that instead; not done yet, needs live verification against a real super-admin session when picked up.
- **Admin's "Email Me a New Password" is hard-pinned to `rsilva1@addu.edu.ph`** (the requesting admin's own email is not used) — every admin's reset lands in one shared inbox, with a "For account: {name} ({email})" line added to disambiguate. Revert by making `recipientEmail` unconditionally `user.email` again once this is no longer needed.
- **Settings' "Email Me a New Password" deliberately stays on Brevo, not Supabase's own Postmark-backed `resetPasswordForEmail`**, even though Postmark is now fully approved — switching would drop the admin-email-pin override above and add volume against Postmark's shared 100/month cap. Revisit only if either tradeoff changes.
- **Postmark's 100-email/month cap is a real, still-active ceiling** on every `/forgot-password` reset — no in-repo guard or warning if it's hit; only a paid plan upgrade removes it.
- `next.config.ts` sets `experimental.serverActions.bodySizeLimit` to `'10mb'` — requires a real dev-server restart to take effect (Next config isn't hot-reloaded).

## Development workflow

There is no automated test suite — "testing" means verifying against the real running app, not skipping from an error message straight to a guessed fix:

- **Before implementing a fix**: reproduce the actual problem first. Read the relevant file(s) in full, check `npm run dev`'s terminal output for the real underlying error (often surfaced generically to the browser but printed in full server-side), and confirm the root cause before editing. Several bugs in this project's history looked like one thing and were actually another (an email typo, an RLS policy, a naming collision) — don't patch the described symptom without confirming the cause.
- **Before implementing a new feature**: check the Route status table and the actual target-route files first — confirm whether something is a true placeholder or partially wired, so an existing `actions.ts` pattern gets reused rather than reinvented differently.
- **After implementing**: run `npm run lint` and `npm run build`. For anything touching a Server Action, form, or auth flow, actually exercise it rather than treating a clean build as sufficient — this codebase has had code that type-checked fine but failed at runtime (RLS, env vars, controlled vs. uncontrolled inputs).
- **`npm run build` must never run while a `npm run dev` server is live in another terminal** — both write into the same `.next/` folder, and running a build alongside a live dev server has corrupted its cached manifests before (symptom: `localhost:3000` stops loading even though the process is still "running"). If you need to compare dev vs. production behavior, stop the dev server first, build, test, then restart dev.
- If a fix is uncertain, prefer a temporary, clearly-labeled debug output (`DEBUG:` prefix, or a labeled `console.log`) over guessing blind — but treat "add it" and "remove it once resolved" as one task, not two. This project's history has multiple examples of debug output nearly shipping to production.
- **Non-trivial work happens on its own branch**, not committed straight to `main` — `git checkout -b feature/<name>`, verify (lint, a production build, an actual look at the running app) on the branch, merge once verified. A one-line fix that's already been verified live can still go straight to `main`. This is specifically about not landing a large, only-partially-verified change directly on the branch every lab PC deploys from.

Required env vars (see `.env.local`, `lib/supabase/*`, `lib/email.ts`): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `BREVO_SMTP_USER`, `BREVO_SMTP_KEY`, `BREVO_SENDER_EMAIL`, `NEXT_PUBLIC_SITE_URL` (must be the real deployed URL, no trailing slash, set in Vercel).

Not in this repo's env, but load-bearing for auth email: **Supabase's own Auth SMTP integration** (dashboard → Project Settings → Authentication → SMTP Settings) is configured to use **Postmark**, not Brevo — Brevo cannot disable link-rewriting/click-tracking for SMTP-relay transactional email, which silently consumed Supabase's one-time recovery tokens before real users could click them. This app's own outbound email (`lib/email.ts`, welcome/correction-notice emails — no security token involved) deliberately stays on Brevo. If a similar "invalid or expired" report comes up for any Supabase email link, trace the actual link's redirect chain (`curl -s -D - -o /dev/null -L "<link>"`) before assuming it's really about expiry — a `sendibt*.com` hop means it's still going through a link-rewriting relay.

Optional: `DATABASE_URL` — a direct Postgres connection string, only for one-off scripts/debugging. Use the connection **pooler** string (port 6543), not the direct host (port 5432, IPv6-only, fails DNS resolution from this dev environment).

## Conventions

- Import alias `@/*` maps to the repo root (`tsconfig.json`).
- Every `<button>` gets `cursor: pointer` globally via `app/globals.css` (native buttons default to `cursor: default`, unlike `<a>` tags).
- **A table row's primary "view/open" action is an outlined pill; a stronger call-to-action (approve, review, create) is the same pill filled solid.** A secondary but real mutating action (Archive, Resolve, Remove) gets a smaller, deliberately muted pill — not a bare underlined text link. See the Modals & confirmations section above for the full button/confirmation convention.
- **`next.config.ts`'s `images.formats` is `['image/avif', 'image/webp']`** (AVIF first, smaller at equivalent quality) — only affects images actually going through `next/image`; raw `<img>`s for Supabase Storage avatars/documents are unaffected either way.
- Tailwind v4 (via `@tailwindcss/postcss`), no `tailwind.config.*` — configuration is CSS-based in `app/globals.css`.
- **Dark mode is real and site-wide**, toggled via `ThemeToggle`, living in each portal's top bar (not the sidebar) plus the public site header. Tailwind's `dark:` is switched to a class strategy (`@custom-variant dark (&:where(.dark, .dark *));`) so `ThemeToggle` can drive `.dark` on `<html>` explicitly; an inline `<script>` in `app/layout.tsx`'s `<head>` applies it synchronously pre-hydration from `localStorage.theme` (falling back to `prefers-color-scheme`) to avoid a flash of wrong theme (`<html>` has `suppressHydrationWarning` for this reason). `viewport.colorScheme` is `'light dark'` — safe now that every surface has real `dark:` styling; forcing it to `'light'` was a previous workaround for browsers auto-inverting unstyled areas.
  - Color mapping convention: `bg-white` → `dark:bg-gray-900`; `bg-gray-50/100` → `dark:bg-gray-800(/60)`; text grays get progressively lighter `dark:` counterparts; brand navy (`#0b1b62` text/border) → `dark:text-indigo-300`/`dark:border-indigo-300`. Vivid brand accents (pink/green/blue) and solid navy buttons are left unchanged — already high-contrast on both surfaces.
  - **If a brand-navy heading/label ever renders dark-on-dark, or a hover state looks unstyled/white in dark mode, it's the same known gap in the original bulk retrofit** — a regex-based pass that silently skipped any Tailwind arbitrary-value class (`text-[#0b1b62]`, because `\b` doesn't match after `]`) and never touched `hover:` variants at all. Grep for `\b(text|bg|border)-\[#[0-9a-fA-F]{3,8}\](?! dark:)` or bare `hover:bg-gray-50`/`hover:bg-gray-100` across `app/`/`components/` to find any remaining instance, rather than assuming it's a new bug.
  - Test account credentials for verifying authenticated pages live in local Claude memory, not this file (CLAUDE.md is checked into git — plaintext credentials here would land in repo history on every lab PC clone). Claude can create a new test account via `/admin/create-new-account` from an already-authenticated tab, but does not perform the actual login/credential-entry itself — a human (or an already-authenticated session handed over) completes sign-in; from there Claude can drive that session via browser automation.
- Validation logic (name format, PH phone format, DOB bounds, parent-older-than-student age check) lives server-side, never just client-side — this project is deliberately pen-tested as part of the coursework.
  - **Name validation**: `lib/name.ts`'s `isValidName`/`NAME_VALIDATION_MESSAGE`/`toTitleCase` is the one shared implementation (requires an actual letter present, `MIN_NAME_LENGTH = 2`, title-cases at insert/update time only — never applied to the `values` echoed back to a form on validation failure). Import from here for any new name-accepting mutation rather than re-deriving the pattern.
  - **DOB validation**: `lib/dob.ts`'s `isValidDob`/`dobRangeMessage` (server-side: not future, respects `minAge`/`maxAge`) plus `dobInputMin`/`dobInputMax` (client-side bounds for UX). Parent DOB enforces an explicit 18+ floor independent of the "at least 10 years older than the student" relative rule.
  - **Every DOB field is a Day/Month/Year triple** (`components/ui/dob-select.tsx`'s `DobSelect`), not a native date input — custom dropdown panels (capped height, scrollable, portaled to `document.body` and positioned `fixed` from the trigger's `getBoundingClientRect()` so they aren't clipped by an ancestor modal's `overflow-y-auto`, and close on outside scroll but not on scrolling their own option list). Takes either `name` (FormData/`useActionState` sites) or `onChange` (controlled-state sites). A Gender `<select>` sitting next to it in the same grid row needs a matching invisible spacer label, since `DobSelect` has two label rows above its inputs where a plain field only has one.
- **"Applicant" vs "Student" terminology is a real distinction, not interchangeable wording.** An **Applicant** exists only as an `applications` row (possibly with a parent account already created), no `students` row yet. A **Student** has an actual `students` row, created only once Applications' document review is fully approved, and only then linked via `parent_student`. UI copy reflects this (User Management's Edit modal shows separate "Enrolled Students" vs "Applicants" lists; `/parent/students` heading says "Applicant Profile" or "Student Profile" depending on state) — `/admin/students`, `/admin/attendance`, `/admin/student-dashboard` deliberately keep saying "Student" since those pages only ever operate on real `students` rows.
