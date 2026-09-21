# Tests

| Command | What it runs | Touches live data? |
| --- | --- | --- |
| `npm test` | Unit tests in `tests/unit/` (dates and ages, validation, fee/school rules, email text). Time is pinned to Manila 2026-09-21. | No |
| `npm run test:integration` | `tests/integration/`: RLS, wallet, unenrollment, album, year-end and daily-job checks with signed-in throwaway accounts. | Yes, writes to the live Supabase project, cleans up |
| `npm run test:sweep` | Lists (or with `--yes` removes) leftovers from an interrupted integration run. | Only `zz-test-*@example.test` accounts |
| `npm run typecheck` / `npm run lint` | TypeScript and ESLint. | No |
| `npm run db:verify` | Migrations rebuild the live schema exactly (needs Docker). | Read-only |

CI (`.github/workflows/ci.yml`) runs lint, typecheck and the unit tests on every push. It
does not run the integration tests, since they need the live project's secrets and write to it.

## Integration tests

They create accounts named `zz-test-<role>-<random>@example.test` with the service role, sign
in as them, and assert what each role can and cannot read or change (a parent promoting
themselves, one family reading another's health data, forging a paid fee, and so on). Every
file removes what it created in `afterAll`. Test accounts never send email. They must not
call anything that notifies all admins (`notifyAdmins`), which would reach the real admins.

The daily job test (`daily-job.test.ts`) uses a fake mailer, a far-future "today" and a client
that can't delete from `notifications`/`notification_log`, so it can't reach real families or wipe
real rows. Not covered: the admin approve/decline unenrollment actions (they need Next's request
scope; the policies and triggers under them are) and the job's 90-day cleanup.

Add a test by using `Fixture` from `tests/integration/helpers.ts`:
`const f = new Fixture(); const parent = await f.user('parent'); const child = await f.student(parent)`
and `await f.cleanup()` in `afterAll`.
