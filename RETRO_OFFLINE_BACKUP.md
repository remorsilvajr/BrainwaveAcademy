# Offline backup plan for the sprint retro

The retro runs on **fixed classroom lab PCs** (ethernet-only, university
network), none of which is the machine this document was written on. This
app depends on cloud Supabase for the database, login, and file storage —
if the lab's internet is bad or down, the app is unusable. Two fallbacks,
in priority order:

## 1. USB tethering (primary plan — try this first)

Plug a phone into the lab PC via USB cable and enable **USB tethering**
(not wifi hotspot) in the phone's settings. Windows sees it as a normal
wired network adapter, no wifi hardware needed on the PC. This also
sidesteps "university wifi is slow," since you're on cellular data instead.

**Verify this works on an actual lab PC before retro day**, not just in
theory — university lab machines sometimes block unrecognized USB network
devices by policy. If it's blocked, you'll want to know that in advance,
not discover it live.

## 2. Local Supabase environment (secondary plan — needs real prep)

A full local replacement for cloud Supabase (Postgres + Auth + Storage
together, via Docker) that removes the internet dependency entirely. This
was **built and fully tested on a home PC** (2026-08-31) to prove the
approach works — login, dashboard data, account creation, and the
email-failure fix were all verified end-to-end. But that home PC will not
be at the retro, so none of its Docker containers, restored data, or
installed software travel with it. To actually use this plan, someone has
to repeat the setup **on the specific lab PC that will be used**, before
retro day.

### Two things to confirm before counting on this plan

- **Lab PCs here do allow student software installs** (confirmed) — so
  installing Docker Desktop is possible in principle.
- **Unconfirmed and worth checking**: many university labs run
  rollback/reimaging software (e.g. Deep Freeze) that wipes any installed
  software on reboot or logout, specifically to stop persistent student
  installs. If that's the case here, installing Docker "in advance" doesn't
  actually persist — it would need to happen the same day, right before the
  retro session, on a PC that then doesn't get rebooted before you use it.
  Ask whoever manages that lab, or just test it: install something small,
  log out, log back in, see if it's still there.

### Setup steps (on the actual lab PC, with good internet, before retro day)

1. Elevated PowerShell (right-click Start → Terminal (Admin)):
   ```
   wsl --install --no-distro
   ```
   Restart when it finishes.
2. Install Docker Desktop, then open it and wait for "Engine running."
3. `git clone` this repo (or `git pull` if already cloned), then from the
   project folder:
   ```
   npx supabase start
   ```
   This pulls several GB of Docker images the first time — budget real
   time for it, and do it somewhere with good internet, not as a
   last-minute thing.
4. `supabase start` prints an `ANON_KEY` and `SERVICE_ROLE_KEY` — create a
   file named `.env.local.retro-backup` in the project root with:
   ```
   NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<ANON_KEY from step 3's output>
   NEXT_PUBLIC_SITE_URL=http://localhost:3000
   SUPABASE_SERVICE_ROLE_KEY=<SERVICE_ROLE_KEY from step 3's output>
   BREVO_SMTP_USER=
   BREVO_SMTP_KEY=
   BREVO_SENDER_EMAIL=noreply@retro.local
   DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres
   ```
   (These `ANON_KEY`/`SERVICE_ROLE_KEY` values are the same on every default
   `supabase init` project unless `config.toml`'s auth secret was changed,
   which it wasn't — so in practice they'll likely match the ones below,
   but always prefer whatever that PC's own `supabase start` just printed.)
5. Schema only exists at this point — no data, no test accounts yet. Create
   working logins with the script in "Recreating test accounts" below.
6. Point the app at local Supabase and restart the dev server:
   ```
   copy .env.local .env.local.cloud-active-backup
   copy .env.local.retro-backup .env.local
   npm run dev
   ```
7. Log in with one of the accounts created in step 5.

### Switching back to cloud afterward

```
copy .env.local.cloud-active-backup .env.local
```
then restart `npm run dev`. `npx supabase stop` shuts the containers down
(data stays in the Docker volume for next time — don't use
`--no-backup`, that discards it).

### Recreating test accounts

With the local stack running, from the project folder, save this as
`seed_accounts.js` and run `node seed_accounts.js`:

```js
const { createClient } = require('@supabase/supabase-js')
const admin = createClient(
  'http://127.0.0.1:54321',
  '<SERVICE_ROLE_KEY from that PC's own `supabase start` output>',
  { auth: { autoRefreshToken: false, persistSession: false } }
)

const PASSWORD = 'RetroBackup2026!'
const accounts = [
  { email: 'admin@retro.local', role: 'admin', first_name: 'Retro', last_name: 'Admin' },
  { email: 'teacher@retro.local', role: 'teacher', first_name: 'Retro', last_name: 'Teacher', gender: 'female' },
  { email: 'parent@retro.local', role: 'parent', first_name: 'Retro', last_name: 'Parent', relationship_to_student: 'Mother', phone_number: '+63 917 000 0000' },
]

async function main() {
  for (const acc of accounts) {
    const { data, error } = await admin.auth.admin.createUser({ email: acc.email, password: PASSWORD, email_confirm: true })
    if (error) { console.log(`FAILED ${acc.email}: ${error.message}`); continue }
    const { error: pErr } = await admin.from('profiles').insert({
      id: data.user.id, role: acc.role, first_name: acc.first_name, middle_name: null,
      last_name: acc.last_name, email: acc.email, phone_number: acc.phone_number ?? null,
      relationship_to_student: acc.relationship_to_student ?? null, gender: acc.gender ?? null,
      is_verified: true, account_status: 'active',
    })
    console.log(pErr ? `Profile failed for ${acc.email}: ${pErr.message}` : `OK: ${acc.email}`)
  }
}
main()
```

Delete this file after running it — it's a one-off script, not part of the
app (harmless to leave since it only talks to `127.0.0.1`, but no reason to
keep it around).

Credentials this creates: `admin@retro.local` / `teacher@retro.local` /
`parent@retro.local`, all with password `RetroBackup2026!`.

### Limitations of local mode

- **Only the accounts you create locally can log in** — Supabase Auth's
  internal password/session format doesn't transfer between projects, so
  there's no way to bring your real cloud parent/teacher/admin accounts
  into local mode.
- **No real email.** Any flow that sends an email (temp password,
  corrections notice) will fail to actually send and silently skip it
  (fixed in code — see the `sendEmail` note in `CLAUDE.md` — these no
  longer crash the action, they just don't deliver anything). Narrate
  "an email would be sent here" rather than showing a real inbox.
- **Starts with no historical data** — a fresh local Supabase project has
  empty tables aside from schema. If you want realistic-looking demo data
  (past applications, attendance history, etc.), you'd need to manually
  create some through the app itself once logged in locally, or restore a
  data dump brought over on a USB drive from wherever one was taken
  (never email/cloud-share a data dump — it would contain real parent/
  student contact info).
- **Not synced with cloud.** Anything created locally during the retro
  stays local; nothing you do in local mode appears back in the cloud
  project afterward, and vice versa. Treat it as a disposable sandbox for
  the day.
