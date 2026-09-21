// Proves a backup can actually be restored, without touching the live project.
//
//   npm run restore:drill -- backups/<folder>
//
// Starts a throwaway Postgres 17 in Docker, gives it the schema from
// supabase/migrations/*.sql plus copies of the live auth.users / auth.identities table
// shapes (generated columns included), runs scripts/restore.mjs against it, then checks
// every table's row count against the backup's manifest and spot-checks that password
// hashes and profile rows survived intact. Needs Docker running and DATABASE_URL (only
// to read the auth table shapes; nothing is written to the live project).
import fs from 'node:fs'
import path from 'node:path'
import { execSync, spawnSync } from 'node:child_process'
import pg from 'pg'

if (process.loadEnvFile) {
  try {
    process.loadEnvFile('.env.local')
  } catch {
    // variables may already be set
  }
}
const backup = process.argv[2]
if (!backup || !fs.existsSync(path.join(backup, 'manifest.json'))) {
  console.error('Usage: npm run restore:drill -- <backup folder>')
  process.exit(2)
}
const manifest = JSON.parse(fs.readFileSync(path.join(backup, 'manifest.json'), 'utf8'))

const NAME = 'brainwave-restore-drill'
const PORT = 55433
const url = `postgres://postgres:pw@localhost:${PORT}/postgres`
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
  const client = new pg.Client({ connectionString: url, connectionTimeoutMillis: 2000 })
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

// Table shapes of the real auth tables, read from the live project.
const live = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } })
await live.connect()
const authTable = async (table) => {
  const { rows } = await live.query(
    `select a.attname, format_type(a.atttypid, a.atttypmod) as type, a.attgenerated, pg_get_expr(d.adbin, d.adrelid) as expr
     from pg_attribute a
     left join pg_attrdef d on d.adrelid = a.attrelid and d.adnum = a.attnum
     where a.attrelid = ('auth.' || $1)::regclass and a.attnum > 0 and not a.attisdropped order by a.attnum`,
    [table]
  )
  const cols = rows.map((r) => (r.attgenerated === 's' ? `"${r.attname}" ${r.type} generated always as (${r.expr}) stored` : `"${r.attname}" ${r.type}`))
  return `create table auth.${table} (${cols.join(', ')}, primary key (id));`
}
const usersDdl = await authTable('users')
const identitiesDdl = await authTable('identities')
await live.end()

await scratch.query(`
  create role anon nologin; create role authenticated nologin; create role service_role nologin;
  create schema if not exists extensions;
  create extension if not exists pgcrypto with schema extensions;
  create extension if not exists "uuid-ossp" with schema extensions;
  create schema auth; create schema storage;
  create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  create function auth.role() returns text language sql stable as $$ select 'anon'::text $$;
  create table storage.buckets (id text primary key, name text not null, public boolean default false, file_size_limit bigint, allowed_mime_types text[]);
  create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text references storage.buckets(id), name text, owner uuid);
  alter table storage.objects enable row level security;
  create function storage.foldername(name text) returns text[] language sql immutable as $$ select (string_to_array(name, '/'))[1:greatest(array_length(string_to_array(name, '/'), 1) - 1, 0)] $$;
  grant usage on schema public, auth, storage, extensions to anon, authenticated, service_role;
`)
await scratch.query(usersDdl)
await scratch.query(identitiesDdl)

const dir = path.resolve('supabase/migrations')
const migrations = fs.readdirSync(dir).filter((f) => f.endsWith('.sql')).sort()
await scratch.query(migrations.map((f) => fs.readFileSync(path.join(dir, f), 'utf8')).join('\n'))
console.log(`Scratch database ready (${migrations.length} migration file(s) replayed).\n`)

const env = { ...process.env, RESTORE_DATABASE_URL: url, RESTORE_SKIP_STORAGE: '1' }
const dry = spawnSync(process.execPath, ['scripts/restore.mjs', backup, '--dry-run'], { env, stdio: 'inherit' })
const real = dry.status === 0 ? spawnSync(process.execPath, ['scripts/restore.mjs', backup], { env, stdio: 'inherit' }) : dry

let problems = 0
if (real.status !== 0) {
  problems++
} else {
  console.log('\nChecking the restored database against the backup:')
  for (const [table, expected] of Object.entries(manifest.tables)) {
    const [schema, name] = table.split('.')
    const { rows } = await scratch.query(`select count(*)::int n from ${schema}."${name}"`)
    if (rows[0].n !== expected) {
      problems++
      console.error(`  ${table}: expected ${expected}, found ${rows[0].n}`)
    }
  }
  const users = JSON.parse(fs.readFileSync(path.join(backup, 'data/auth.users.json'), 'utf8'))
  const { rows: hashes } = await scratch.query(`select id, encrypted_password, email from auth.users`)
  const byId = new Map(hashes.map((r) => [r.id, r]))
  const wrong = users.filter((u) => byId.get(u.id)?.encrypted_password !== u.encrypted_password || byId.get(u.id)?.email !== u.email)
  if (wrong.length > 0) {
    problems++
    console.error(`  ${wrong.length} account(s) came back with a different email or password hash`)
  }
  const profiles = JSON.parse(fs.readFileSync(path.join(backup, 'data/public.profiles.json'), 'utf8'))
  const { rows: restored } = await scratch.query(`select to_jsonb(p) as j from public.profiles p`)
  const restoredById = new Map(restored.map((r) => [r.j.id, r.j]))
  const changed = profiles.filter((p) => {
    const r = restoredById.get(p.id)
    return !r || r.role !== p.role || r.account_id !== p.account_id || r.first_name !== p.first_name
  })
  if (changed.length > 0) {
    problems++
    console.error(`  ${changed.length} profile(s) came back different`)
  }
  if (problems === 0) console.log(`  every table's row count matches, ${users.length} accounts kept their password hashes, ${profiles.length} profiles identical`)
}

await scratch.end()
stop()
console.log(problems === 0 ? '\nRestore drill passed: this backup restores cleanly.' : '\nRestore drill FAILED.')
process.exit(problems === 0 ? 0 : 1)
