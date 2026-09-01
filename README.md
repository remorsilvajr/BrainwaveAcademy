# Brainwave Preschool Academy

A school admin / enrollment portal for Brainwave Preschool Academy, built with Next.js and Supabase. Public marketing site plus a public enrollment form live outside auth; everything else is gated behind one of three roles — **admin**, **teacher**, **parent** — each with its own dashboard, sidebar, and set of pages.

**Live**: https://brainwave-academy-phi.vercel.app/

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
