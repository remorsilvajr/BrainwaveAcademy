// Removes anything the integration tests left behind (a run that was killed part way).
//
//   npm run test:sweep            list what would be removed
//   npm run test:sweep -- --yes   remove it
//
// Test accounts are identified ONLY by an email like zz-test-*@example.test, which no real
// family can have, and test students by being linked to such an account. Real data is
// never matched.
import pg from 'pg'
import { createClient } from '@supabase/supabase-js'

if (process.loadEnvFile) {
  try {
    process.loadEnvFile('.env.local')
  } catch {
    // variables may already be set
  }
}
const yes = process.argv.includes('--yes')
const db = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } })
await db.connect()

const users = (await db.query(`select id, email from auth.users where email like 'zz-test-%@example.test'`)).rows
const ids = users.map((u) => u.id)
const students = ids.length
  ? (await db.query(`select distinct student_id from public.parent_student where parent_id = any($1)`, [ids])).rows.map((r) => r.student_id)
  : []
// A student created without a link (a test that died before linking it) has no owner to find it by;
// the only such rows use this last name.
const orphans = (await db.query(`select id from public.students where last_name = 'Child' and first_name = 'Test' and id not in (select student_id from public.parent_student)`)).rows.map((r) => r.id)
const allStudents = [...new Set([...students, ...orphans])]

console.log(`${users.length} test account(s), ${allStudents.length} test student(s)`)
for (const u of users) console.log(`  ${u.email}`)
if (!yes) {
  console.log('\nNothing removed. Re-run with --yes to remove them.')
  await db.end()
  process.exit(0)
}

const tryRun = async (sql, params) => {
  try {
    await db.query(sql, params)
  } catch (e) {
    console.error(`  skipped (${e.message.split('\n')[0]}): ${sql.slice(0, 70)}`)
  }
}
if (allStudents.length) {
  for (const table of ['student_health', 'emergency_contacts', 'do_not_release', 'attendance', 'milestones', 'authorized_pickups', 'payment_adjustments', 'unenrollment_requests', 'student_promotions', 'parent_student', 'payments']) {
    await tryRun(`delete from public.${table} where student_id = any($1)`, [allStudents])
  }
  await tryRun(`delete from public.students where id = any($1)`, [allStudents])
}
if (ids.length) {
  await tryRun(`delete from public.parent_student where parent_id = any($1)`, [ids])
  for (const [table, column] of [
    ['notifications', 'user_id'],
    ['wallet_transactions', 'parent_id'],
    ['wallet_requests', 'parent_id'],
    ['wallets', 'parent_id'],
    ['feedback', 'submitted_by'],
    ['event_rsvps', 'parent_id'],
    ['album_photos', 'uploaded_by'],
    ['classroom_assistants', 'teacher_id'],
    ['activity_log', 'actor_id'],
    ['profiles', 'id'],
  ]) {
    await tryRun(`delete from public.${table} where ${column} = any($1)`, [ids])
  }
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
  for (const id of ids) await admin.auth.admin.deleteUser(id)
}
await db.query(`delete from public.login_attempts where email like 'zz-test-%@example.test'`)
await db.end()
console.log('Done.')
