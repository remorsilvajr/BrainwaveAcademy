# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Project

Brainwave Preschool Academy — a Next.js (App Router) admin/enrollment portal backed by Supabase (Postgres + Auth). There are three user roles — `admin`, `teacher`, `parent` — each with its own route section, sidebar nav, and dashboard.

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

## Architecture

**Role-based routing via middleware, not layout guards.** `middleware.ts` is the single gatekeeper for `/admin`, `/teacher`, `/parent`:
- Unauthenticated users hitting a protected path are redirected to `/login`.
- Authenticated users are read from the `profiles` table (`role` column) and bounced to `/${role}` if they try to access a section that isn't theirs (e.g. a parent visiting `/admin/*` is redirected to `/parent`).
- The matcher excludes `_next/static`, `_next/image`, `favicon.ico`, and static image extensions.

Each role has its own `app/<role>/layout.tsx` that renders `<Sidebar>` (`components/sidebar.tsx`) with a hardcoded `NavSection[]` array for that role — this is the source of truth for what pages exist under each role and their nav labels. There's no shared nav config; adding a page means adding both the route and a matching sidebar entry in that role's layout.

**Supabase client selection matters and is security-sensitive** (`lib/supabase/`):
- `client.ts` — `createClient()` (sync) for Client Components only.
- `server.ts` — `createClient()` (async, must be `await`ed) for Server Components, Server Actions, and Route Handlers. Cookie writes are wrapped in try/catch because Server Components can't set cookies — the middleware's session refresh covers that case.
- `admin.ts` — `createAdminClient()` uses the Supabase **service role key** and bypasses Row Level Security entirely. Never import it into a Client Component; never expose `SUPABASE_SERVICE_ROLE_KEY` with a `NEXT_PUBLIC_` prefix.

**Auth/mutation logic lives in `actions.ts` files colocated with their route** (e.g. `app/login/actions.ts`, `app/enroll/actions.ts`, `app/forgot-password/actions.ts`), marked `'use server'`. Form components under `components/` (e.g. `components/auth/`, `components/enroll/`, `components/settings/`) call these actions and are responsible for rendering returned `fieldErrors`/`values` state (see `SubmitApplicationState` pattern in `app/enroll/actions.ts`) rather than doing client-side validation.

**Email** goes through `lib/email.ts` (`sendEmail`), which uses `nodemailer` against Brevo's SMTP relay (`BREVO_SMTP_USER`, `BREVO_SMTP_KEY`, `BREVO_SENDER_EMAIL` env vars).

**Known temporary state:** `app/login/actions.ts` and `app/enroll/actions.ts` currently return raw Supabase error messages to the client with a `DEBUG:` prefix (commented as temporary, with the intended generic message commented out beside it). Don't treat this as the intended behavior — restore the generic error message rather than extending the debug output, unless the user asks otherwise.

## Environment variables

Required (see `.env.local`, `lib/supabase/*`, `lib/email.ts`): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `BREVO_SMTP_USER`, `BREVO_SMTP_KEY`, `BREVO_SENDER_EMAIL`.

## Conventions

- Import alias `@/*` maps to the repo root (`tsconfig.json`).
- Tailwind v4 (via `@tailwindcss/postcss`), no `tailwind.config.*` file — configuration is CSS-based in `app/globals.css`.
- No database migrations are checked into the repo; schema (`profiles`, `applications`, etc.) lives in Supabase directly.
