// Full backup of the Brainwave Academy Supabase project to a local folder.
//
//   npm run backup                 -> backups/<timestamp>/
//   npm run backup -- --out DIR    -> DIR (must not exist yet)
//   npm run backup -- --no-storage skip downloading uploaded files
//
// What it saves:
//   data/public.<table>.json     every row of every table in the public schema
//   data/auth.users.json         accounts INCLUDING PASSWORD HASHES (so a restore keeps
//   data/auth.identities.json    everyone's login working)
//   storage/<bucket>/<path>      every uploaded file (documents, photos, avatars, album)
//   manifest.json                row counts + a SHA-256 for every file, used by restore
//
// The folder holds personal data about children and families and real password hashes.
// It is gitignored. Keep it somewhere private (an encrypted drive), never in the repo,
// email or a shared folder. Needs DATABASE_URL, NEXT_PUBLIC_SUPABASE_URL and
// SUPABASE_SERVICE_ROLE_KEY in .env.local. Read-only against the live project.
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import pg from 'pg'
import { createClient } from '@supabase/supabase-js'

if (process.loadEnvFile) {
  try {
    process.loadEnvFile('.env.local')
  } catch {
    // variables may already be set
  }
}
const args = process.argv.slice(2)
const flag = (name) => args.includes(name)
const value = (name) => (args.includes(name) ? args[args.indexOf(name) + 1] : null)

for (const key of ['DATABASE_URL', 'NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']) {
  if (!process.env[key]) {
    console.error(`${key} is not set (see .env.local).`)
    process.exit(2)
  }
}

const stamp = new Date().toISOString().replace(/[:.]/g, '-')
const out = path.resolve(value('--out') ?? `backups/${stamp}`)
if (fs.existsSync(out)) {
  console.error(`${out} already exists. Choose a new folder.`)
  process.exit(2)
}
fs.mkdirSync(path.join(out, 'data'), { recursive: true })

const sha256 = (buffer) => crypto.createHash('sha256').update(buffer).digest('hex')
const manifest = { createdAt: new Date().toISOString(), tables: {}, files: {}, storage: {} }

const db = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } })
await db.connect()
// One consistent snapshot for the whole export.
await db.query('begin isolation level repeatable read read only')

const { rows: tableRows } = await db.query(
  `select table_schema, table_name from information_schema.tables
   where table_type = 'BASE TABLE' and (table_schema = 'public' or (table_schema = 'auth' and table_name in ('users', 'identities')))
   order by table_schema, table_name`
)
for (const { table_schema: schema, table_name: table } of tableRows) {
  const { rows } = await db.query(`select coalesce(json_agg(t), '[]'::json) as data, count(*)::int as n from ${schema}."${table}" t`)
  const file = `data/${schema}.${table}.json`
  const body = Buffer.from(JSON.stringify(rows[0].data))
  fs.writeFileSync(path.join(out, file), body)
  manifest.tables[`${schema}.${table}`] = rows[0].n
  manifest.files[file] = sha256(body)
  console.log(`  ${`${schema}.${table}`.padEnd(38)} ${String(rows[0].n).padStart(6)} rows`)
}

// Which objects exist, read in the same snapshot, then downloaded through the API.
const { rows: objects } = await db.query(`select bucket_id, name from storage.objects order by bucket_id, name`)
await db.query('commit')
await db.end()

if (!flag('--no-storage')) {
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
  let done = 0
  const failed = []
  for (const { bucket_id: bucket, name } of objects) {
    const { data, error } = await admin.storage.from(bucket).download(name)
    if (error || !data) {
      failed.push(`${bucket}/${name}: ${error?.message ?? 'no data'}`)
      continue
    }
    const buffer = Buffer.from(await data.arrayBuffer())
    const file = `storage/${bucket}/${name}`
    fs.mkdirSync(path.dirname(path.join(out, file)), { recursive: true })
    fs.writeFileSync(path.join(out, file), buffer)
    manifest.files[file] = sha256(buffer)
    manifest.storage[bucket] = (manifest.storage[bucket] ?? 0) + 1
    done++
  }
  console.log(`\n  storage: ${done} of ${objects.length} file(s) downloaded across ${Object.keys(manifest.storage).length} bucket(s)`)
  if (failed.length > 0) {
    console.error(`\n  ${failed.length} file(s) could not be downloaded:`)
    for (const f of failed.slice(0, 20)) console.error(`    ${f}`)
    manifest.failedFiles = failed
  }
} else {
  manifest.storageSkipped = true
}

fs.writeFileSync(path.join(out, 'manifest.json'), JSON.stringify(manifest, null, 2))
const totalRows = Object.values(manifest.tables).reduce((a, b) => a + b, 0)
console.log(`\nBackup written to ${out}`)
console.log(`  ${Object.keys(manifest.tables).length} tables, ${totalRows} rows, ${Object.keys(manifest.files).length} files`)
console.log('  Contains personal data and password hashes. Store it privately; it is gitignored.')
process.exit(manifest.failedFiles ? 1 : 0)
