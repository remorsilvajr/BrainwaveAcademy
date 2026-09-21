// Restores a backup made by scripts/backup.mjs into a Supabase project.
//
//   npm run restore -- backups/<folder> --dry-run   check the backup, change nothing
//   npm run restore -- backups/<folder>             restore into the project in .env.local
//
// Restore into a NEW, EMPTY project: first run supabase/migrations/*.sql and
// supabase/seed.sql in its SQL Editor (see supabase/README.md), put the new project's
// DATABASE_URL / NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in .env.local,
// then run this. It refuses to run if any table already has rows (pass --force only if
// you are sure), and everything in the database goes in ONE transaction: it all lands
// or none of it does. Uploaded files are copied back afterwards.
//
// Foreign keys and triggers are switched off for the load (session_replication_role =
// replica) so row order doesn't matter and triggers (ID generation, parent locks) don't
// rewrite anything: rows come back exactly as they were. Set RESTORE_SKIP_STORAGE=1 to
// skip the file upload (used by the automated restore test).
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
const dir = args.find((a) => !a.startsWith('--'))
const dryRun = args.includes('--dry-run')
const force = args.includes('--force')
if (!dir) {
  console.error('Usage: npm run restore -- <backup folder> [--dry-run] [--force]')
  process.exit(2)
}
const root = path.resolve(dir)
if (!fs.existsSync(path.join(root, 'manifest.json'))) {
  console.error(`${root} is not a backup folder (no manifest.json).`)
  process.exit(2)
}
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'))

// 1. Integrity: every file must match its recorded checksum.
let bad = 0
for (const [file, expected] of Object.entries(manifest.files)) {
  const p = path.join(root, file)
  const actual = fs.existsSync(p) ? crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex') : null
  if (actual !== expected) {
    bad++
    console.error(`  CORRUPT OR MISSING: ${file}`)
  }
}
if (bad > 0) {
  console.error(`\n${bad} file(s) failed the integrity check. Not restoring.`)
  process.exit(1)
}
const totalRows = Object.values(manifest.tables).reduce((a, b) => a + b, 0)
console.log(`Backup from ${manifest.createdAt}: ${Object.keys(manifest.tables).length} tables, ${totalRows} rows, ${Object.keys(manifest.files).length} files. Integrity OK.`)
if (manifest.failedFiles) console.warn(`  Note: ${manifest.failedFiles.length} file(s) could not be downloaded when this backup was made.`)

const connectionString = process.env.RESTORE_DATABASE_URL ?? process.env.DATABASE_URL
if (!connectionString) {
  console.error('DATABASE_URL is not set (see .env.local).')
  process.exit(2)
}
const ssl = /localhost|127\.0\.0\.1/.test(connectionString) ? false : { rejectUnauthorized: false }
const db = new pg.Client({ connectionString, ssl })
await db.connect()

const tables = Object.keys(manifest.tables)

// 2. Safety: the target must be empty.
const nonEmpty = []
for (const t of tables) {
  const [schema, name] = t.split('.')
  const { rows } = await db.query(`select count(*)::int n from ${schema}."${name}"`)
  if (rows[0].n > 0) nonEmpty.push(`${t} (${rows[0].n} rows)`)
}
console.log(`Target database: ${new URL(connectionString).host}`)
if (nonEmpty.length > 0 && !force) {
  console.error(`\nThe target is not empty, so nothing was restored:\n  ${nonEmpty.join('\n  ')}\nRestore into a new empty project, or pass --force to add rows anyway.`)
  await db.end()
  process.exit(1)
}

if (dryRun) {
  console.log('\nDry run: would restore')
  for (const t of tables) console.log(`  ${t.padEnd(38)} ${String(manifest.tables[t]).padStart(6)} rows`)
  const files = Object.keys(manifest.files).filter((f) => f.startsWith('storage/')).length
  console.log(`  ${files} uploaded file(s) across ${Object.keys(manifest.storage).length} bucket(s)`)
  console.log('Nothing was changed.')
  await db.end()
  process.exit(0)
}

// 3. Load everything in one transaction.
const CHUNK = 500
try {
  await db.query('begin')
  await db.query(`set local session_replication_role = 'replica'`)
  for (const t of tables) {
    const [schema, name] = t.split('.')
    const rows = JSON.parse(fs.readFileSync(path.join(root, `data/${t}.json`), 'utf8'))
    // Generated columns (e.g. auth.users.confirmed_at) can't be inserted into.
    const { rows: cols } = await db.query(
      `select column_name from information_schema.columns
       where table_schema = $1 and table_name = $2 and is_generated = 'NEVER' order by ordinal_position`,
      [schema, name]
    )
    const list = cols.map((c) => `"${c.column_name}"`).join(', ')
    for (let i = 0; i < rows.length; i += CHUNK) {
      await db.query(`insert into ${schema}."${name}" (${list}) select ${list} from json_populate_recordset(null::${schema}."${name}", $1::json)`, [JSON.stringify(rows.slice(i, i + CHUNK))])
    }
    const { rows: counted } = await db.query(`select count(*)::int n from ${schema}."${name}"`)
    if (!force && counted[0].n !== manifest.tables[t]) {
      throw new Error(`${t}: expected ${manifest.tables[t]} rows after restore, found ${counted[0].n}`)
    }
    console.log(`  ${t.padEnd(38)} ${String(rows.length).padStart(6)} rows restored`)
  }
  await db.query('commit')
} catch (e) {
  await db.query('rollback').catch(() => {})
  console.error(`\nRESTORE FAILED, nothing was changed: ${e.message}`)
  await db.end()
  process.exit(1)
}
await db.end()

// 4. Files.
if (process.env.RESTORE_SKIP_STORAGE === '1') {
  console.log('\nRESTORE_SKIP_STORAGE=1: uploaded files were not restored.')
} else {
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
  const files = Object.keys(manifest.files).filter((f) => f.startsWith('storage/'))
  let ok = 0
  const failed = []
  for (const file of files) {
    const [, bucket, ...rest] = file.split('/')
    const name = rest.join('/')
    const { error } = await admin.storage.from(bucket).upload(name, fs.readFileSync(path.join(root, file)), { upsert: true })
    if (error) failed.push(`${file}: ${error.message}`)
    else ok++
  }
  console.log(`\nFiles: ${ok} of ${files.length} uploaded.`)
  for (const f of failed.slice(0, 20)) console.error(`  FAILED ${f}`)
  if (failed.length > 0) process.exit(1)
}
console.log('\nRestore complete. People log in with their existing passwords.')
