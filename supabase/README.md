# Database: migrations, backups and restore

The whole database schema lives in `supabase/migrations/` (tables, columns, constraints,
indexes, functions, triggers, RLS policies, enums, storage buckets and their policies).
`supabase/seed.sql` holds the reference data a fresh project needs (the 6 classrooms and the
calendar events). Together they can rebuild the school's database from nothing.

## Changing the schema

The workflow has not changed: **Claude writes the SQL, the user runs it in the Supabase SQL
Editor, and the result is re-verified.** What is new is that every SQL block that changes the
schema or RLS is also saved as the next numbered file in `supabase/migrations/`
(`YYYYMMDDHHMMSS_short_name.sql`, in run order) in the same commit. Never edit an old
migration file; add a new one.

Then run:

```
npm run db:verify
```

It starts a throwaway Postgres in Docker (Docker Desktop must be running), replays every
migration file, and compares the result with the live database: tables, columns,
constraints, indexes, functions, triggers, policies, RLS flags, enums and buckets. It exits
non-zero and lists the differences if the files and the live database disagree, which
catches both a forgotten migration file and a change made by hand.

## Backups

```
npm run backup                    # writes backups/<timestamp>/
npm run backup -- --out D:\safe   # somewhere else (must not exist yet)
npm run backup -- --no-storage    # data only, skip uploaded files
```

A backup is a folder holding every row of every table (`data/*.json`, including
`auth.users` with password hashes so everyone keeps their password), every uploaded file
(`storage/<bucket>/...`) and a `manifest.json` with row counts and a SHA-256 per file. It is
read-only against the live project and takes a consistent snapshot of the tables.

**The folder contains children's records and real password hashes.** It is gitignored. Keep
it on an encrypted drive or private cloud storage, never email or share it, and delete old
ones you no longer need.

Supabase's own daily backups (a paid-plan feature) are the other layer. This script is the
one you control: run it before any risky change (a big migration, a bulk edit) and on a
regular schedule (weekly is reasonable for a school this size). Keep the last few.

## Restoring (disaster recovery)

Restore into a **new, empty** Supabase project:

1. Create the new project. In its SQL Editor run every file in `supabase/migrations/` in
   order, then `supabase/seed.sql`.
2. Point `DATABASE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` and
   `SUPABASE_SERVICE_ROLE_KEY` (`.env.local` and Vercel) at the new project. Also redo the
   dashboard-only settings that are not in these files: Auth SMTP (Postmark), the Auth site
   URL and redirect URLs.
3. Check the backup first, changing nothing:
   `npm run restore -- backups/<folder> --dry-run`
4. Restore: `npm run restore -- backups/<folder>`

Restore verifies every file's checksum, refuses to run into a database that already has
rows (unless `--force`), loads all tables in one transaction (all or nothing), then uploads
the files. People log in with their existing passwords.

### Prove it works: the restore drill

```
npm run restore:drill -- backups/<folder>
```

Restores a backup into a throwaway Docker Postgres (schema from the migrations) and checks
every table's row count, that every account kept its password hash, and that profiles are
identical. Run it after making a backup you care about; a backup you have never restored is
only a hope.
