// Proves that supabase/migrations/*.sql rebuilds the live database's schema.
//
//   npm run db:verify
//
// Starts a throwaway Postgres 17 in Docker, stubs the parts of a Supabase project the
// migrations assume (roles, auth/storage schemas), replays every migration in order in
// one transaction, then compares the result with the live database from DATABASE_URL:
// tables, columns, constraints, indexes, functions, triggers, RLS policies (public and
// storage), RLS flags, enums and storage buckets. Read-only against the live database.
// Needs Docker running and `DATABASE_URL` in .env.local.
import fs from 'node:fs'
import path from 'node:path'
import { execSync } from 'node:child_process'
import pg from 'pg'

if (process.loadEnvFile) {
  try {
    process.loadEnvFile('.env.local')
  } catch {
    // no .env.local: DATABASE_URL may already be in the environment
  }
}
if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is not set (see .env.local).')
  process.exit(2)
}

const dir = path.resolve('supabase/migrations')
const files = fs.readdirSync(dir).filter((f) => f.endsWith('.sql')).sort()
const sql = files.map((f) => fs.readFileSync(path.join(dir, f), 'utf8')).join('\n')
console.log(`Replaying ${files.length} migration file(s): ${files.join(', ')}`)

const NAME = 'brainwave-schema-verify'
const PORT = 55432
const stop = () => {
  try {
    execSync(`docker rm -f ${NAME}`, { stdio: 'ignore' })
  } catch {
    // not running
  }
}
stop()
execSync(`docker run -d --name ${NAME} -e POSTGRES_PASSWORD=pw -p ${PORT}:5432 postgres:17`, { stdio: 'ignore' })

let scratch
for (let i = 0; i < 90 && !scratch; i++) {
  const client = new pg.Client({ connectionString: `postgres://postgres:pw@localhost:${PORT}/postgres`, connectionTimeoutMillis: 2000 })
  try {
    await client.connect()
    await client.query('select 1')
    scratch = client
  } catch {
    await client.end().catch(() => {})
    await new Promise((r) => setTimeout(r, 1000))
  }
}
if (!scratch) {
  stop()
  console.error('The scratch Postgres did not start. Is Docker running?')
  process.exit(2)
}

// What any Supabase project already provides before a migration runs.
await scratch.query(`
  create role anon nologin; create role authenticated nologin; create role service_role nologin;
  create schema if not exists extensions;
  create extension if not exists pgcrypto with schema extensions;
  create extension if not exists "uuid-ossp" with schema extensions;
  create schema auth; create schema storage;
  create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  create function auth.role() returns text language sql stable as $$ select 'anon'::text $$;
  create table auth.users (id uuid primary key, email text);
  create table storage.buckets (id text primary key, name text not null, public boolean default false, file_size_limit bigint, allowed_mime_types text[]);
  create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text references storage.buckets(id), name text, owner uuid);
  alter table storage.objects enable row level security;
  create function storage.foldername(name text) returns text[] language sql immutable as $$ select (string_to_array(name, '/'))[1:greatest(array_length(string_to_array(name, '/'), 1) - 1, 0)] $$;
  grant usage on schema public, auth, storage, extensions to anon, authenticated, service_role;
`)

let failure = null
try {
  await scratch.query('begin')
  await scratch.query(sql)
  await scratch.query('commit')
} catch (e) {
  failure = e
  await scratch.query('rollback').catch(() => {})
}
if (failure) {
  console.error(`\nREPLAY FAILED: ${failure.message}`)
  await scratch.end()
  stop()
  process.exit(1)
}

const live = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } })
await live.connect()

// One row per object as text, compared as sets (so row order and CR/LF noise in function
// bodies don't matter).
const norm = (t) => t.split(String.fromCharCode(13)).join('')
const checks = {
  tables: `select table_name v from information_schema.tables where table_schema='public' and table_type='BASE TABLE'`,
  columns: `select table_name||'.'||column_name||':'||data_type||':'||is_nullable||':'||coalesce(column_default,'') v from information_schema.columns where table_schema='public'`,
  constraints: `select conrelid::regclass::text||'.'||conname||' :: '||pg_get_constraintdef(oid) v from pg_constraint where connamespace='public'::regnamespace`,
  indexes: `select indexdef v from pg_indexes where schemaname='public'`,
  functions: `select pg_get_functiondef(oid) v from pg_proc where pronamespace='public'::regnamespace`,
  triggers: `select pg_get_triggerdef(oid) v from pg_trigger where tgrelid in (select oid from pg_class where relnamespace='public'::regnamespace) and not tgisinternal`,
  policies: `select schemaname||'.'||tablename||'.'||policyname||':'||cmd||':'||coalesce(qual,'')||':'||coalesce(with_check,'') v from pg_policies where schemaname in ('public','storage')`,
  'RLS enabled': `select relname||':'||relrowsecurity::text v from pg_class where relnamespace='public'::regnamespace and relkind='r'`,
  enums: `select t.typname||':'||e.enumlabel v from pg_type t join pg_enum e on e.enumtypid=t.oid where t.typnamespace='public'::regnamespace`,
  buckets: `select id||':'||public::text||':'||coalesce(file_size_limit::text,'')||':'||coalesce(array_to_string(allowed_mime_types, ','),'') v from storage.buckets`,
}

let differences = 0
console.log('\nLive database vs replayed migrations:')
for (const [label, query] of Object.entries(checks)) {
  const a = new Set((await live.query(query)).rows.map((r) => norm(r.v)))
  const b = new Set((await scratch.query(query)).rows.map((r) => norm(r.v)))
  const onlyLive = [...a].filter((x) => !b.has(x))
  const onlyScratch = [...b].filter((x) => !a.has(x))
  const same = onlyLive.length === 0 && onlyScratch.length === 0
  if (!same) differences++
  console.log(`  ${label.padEnd(12)} ${same ? `identical (${a.size})` : `DIFFERENT: ${onlyLive.length} only live, ${onlyScratch.length} only in migrations`}`)
  for (const x of onlyLive.slice(0, 3)) console.log(`      live only: ${x.slice(0, 200).split('\n').join(' ')}`)
  for (const x of onlyScratch.slice(0, 3)) console.log(`      migrations only: ${x.slice(0, 200).split('\n').join(' ')}`)
}

await live.end()
await scratch.end()
stop()
console.log(differences === 0 ? '\nThe migrations rebuild the live schema exactly.' : `\n${differences} kind(s) of difference: the migrations are out of date (or the live database was changed by hand).`)
process.exit(differences === 0 ? 0 : 1)
