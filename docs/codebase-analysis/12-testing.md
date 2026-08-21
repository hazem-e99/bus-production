# 12 — Testing

## Backend

**`backend/test/api.e2e-spec.ts`** (321 lines) — a plain Jest test file using the
raw Node `http` module (not Nest's `TestingModule`/`supertest`, despite
`supertest` being a devDependency). It logs in as admin/student/driver in
`beforeAll` against a **live, already-running server on `http://localhost:7126`**
— this is a true black-box E2E suite that requires the app and a seeded database
to already be running; it is not an isolated/mocked unit test.

Coverage (by `describe` block):
- **Authentication**: admin login success, invalid credentials, non-existent
  user, duplicate student registration rejected, reset-password with a bad token
  rejected, unauthenticated request → 401.
- **Users**: get all (admin), get by role, get profile, update profile, reject
  wrong current password on change-password.
- **Buses**: get all, create a bus, duplicate bus handled gracefully (not a 500).
- **Trips**: get all, upcoming, completed, search, by-status, driver's own trips.
- **TripBooking**: search bookings, check eligibility.
- **Payment**: get all, statistics, pending.
- **Notifications**: get all, unread count, broadcast.
- **Subscription Plans**: get all, active, filter by price range.
- **Student Subscriptions**: my-subscriptions, expiring-soon.
- **Routes**: get all routes, get all trip routes.
- **Settings**: get settings (admin), get maintenance-mode (public, no auth).
- **Forms (Public)**: get forms without auth.
- **Student Dashboard**: stats, recent-trips, upcoming-trips, scoped by a
  freshly-logged-in student's ID.
- **Bookings (Legacy)**: get all bookings.

`backend/jest.config.js`: `testRegex: '.e2e-spec.ts$'` (only picks up
`*.e2e-spec.ts` files — **no unit-test pattern is configured at all**), `ts-jest`
transform, `testEnvironment: 'node'`, `testTimeout: 30000`.

**`backend/package.json` scripts**: `build`, `format`, `start`, `start:dev`,
`start:debug`, `start:prod`, `lint`, `seed`, `db:init`. **There is no `test`
script** despite `jest`, `ts-jest`, `supertest`, `@types/jest`,
`@types/supertest` all being devDependencies — running the E2E suite requires
invoking `jest`/`npx jest` directly, not `npm test`.

**What is not covered**: no unit tests for any service/controller in isolation
(no mocked-Mongoose-model tests), no tests for the admin-purge endpoint, no
tests for the WebSocket gateway, no tests for file upload, no tests for the
`AllExceptionsFilter`'s error-mapping behavior, no tests for guards
(`JwtAuthGuard`/`RolesGuard`) in isolation.

## Frontend

**No test files exist anywhere under `frontend/src` or `frontend/scripts`.**
Searches for `**/*.test.{ts,tsx,js,jsx}`, `**/*.spec.{ts,tsx,js,jsx}`,
`jest.config.*`, `vitest.config.*`, and `playwright.config.*`/`cypress.config.*`
matched **only files inside `node_modules`** (third-party packages' own test
suites) — zero matches in the project's own source tree.

**`frontend/package.json` scripts**: `dev`, `build`, `build:prod`, `start`,
`start:prod`, `i18n:check`, `i18n:translate`, `lint`. **No test script
whatsoever**, and no test framework (Jest, Vitest, Testing Library, Playwright,
Cypress) appears in `dependencies` or `devDependencies`.

## Overall testing posture

The only real automated test coverage in the entire repository is a single
backend E2E spec file that exercises live HTTP endpoints against a running,
seeded server — and even that suite is not wired into `npm test` on either side.
There are:
- **No backend unit tests.**
- **No frontend tests of any kind** (unit, integration, or E2E/browser).
- **No CI configuration found** in this repository (no `.github/workflows`,
  no other CI config file) that might otherwise run the E2E suite
  automatically — needs-verification only in the sense that CI could be
  configured outside this repo (e.g. in a separate ops/CI repo or a hosted
  service's dashboard), but nothing in this checkout indicates that.

This is a significant gap given the presence of destructive operations (the
admin database purge) and financial logic (payment review/subscription
activation) with zero automated regression coverage protecting them. See
`14-risks-observations.md`.
