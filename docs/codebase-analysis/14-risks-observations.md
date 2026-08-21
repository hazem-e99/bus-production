# 14 — Risks & Observations

Each item is tagged **confirmed-issue** (verified by direct code read),
**likely-issue** (strong evidence, some inference), **architectural-concern**
(a design choice with tradeoffs, not necessarily a bug), or
**needs-verification** (plausible but not fully confirmed in this pass).

## Critical

### C1. Unauthenticated staff self-registration can create an Admin account with a publicly-known default password — confirmed-issue
`POST /api/Authentication/registration-staff` is `@Public()`
(`backend/src/modules/authentication/authentication.controller.ts:28-32`), takes
a caller-supplied `role` restricted only to
`['Admin','Conductor','Driver','MovementManager']` via `@IsIn`
(`backend/src/modules/authentication/dto/staff-registration.dto.ts:26-29`), and
`AuthenticationService.registerStaff()` assigns every new staff account the
**hardcoded password `'DefaultPass123!'`**
(`backend/src/modules/authentication/authentication.service.ts:159`,
`bcrypt.hash('DefaultPass123!', 10)`). The only gate before login is email
verification, which is also a `@Public()` endpoint requiring only the 6-digit
code sent to the registrant's own email
(`authentication.controller.ts:34-39`). An external attacker who controls any
email address can therefore: register with `role:'Admin'`, verify their own
email, and log in as an Admin using the well-known default password — gaining
access to the admin database-purge feature and every other admin capability.
**Remediation direction**: restrict `registration-staff` to `@Roles('Admin')`
(admin-invited staff creation only), or at minimum remove `'Admin'` from the
allowed self-registration roles and require a random, single-use
force-password-change token instead of a shared hardcoded password.

## High

### H1. Most backend endpoints have no role restriction beyond "authenticated" — confirmed-issue
Global guards are `JwtAuthGuard` + `RolesGuard`
(`backend/src/app.module.ts`), but `RolesGuard` is a no-op unless a controller
carries `@Roles()` metadata (`backend/src/common/guards/roles.guard.ts:14-16`).
Confirmed by reading every controller: `users`, `buses`, `trips`,
`trip-booking`, `bookings`, `payment`, `notifications`, `subscription-plan`,
`student-subscription`, `routes`, `trip-routes`, `attendance`,
`student-dashboard`, and `settings` apply **no `@Roles()` guard anywhere**.
Concretely, any authenticated user of any role — including a Student — can
currently: delete any user (`DELETE /api/Users/:id`), delete any bus/route/trip,
approve or reject any payment and trigger subscription activation
(`PUT /api/Payment/:id/review`), broadcast a notification to every user
(`POST /api/Notifications/broadcast`), and view any other student's dashboard
by ID (`GET /api/StudentDashboard/:studentId/stats`, no ownership check). Full
list in `05-api-map.md`. The system currently relies entirely on the frontend
UI simply not exposing these actions to non-admin roles, which is not a
security boundary.

### H2. Payment review has no role restriction — confirmed-issue (subset of H1, called out separately for severity)
`PUT /api/Payment/:id/review` triggers real financial/business-state changes
(auto-creates or extends a `StudentSubscription` on `Accepted`,
`backend/src/modules/payment/payment.service.ts` around lines 90-138) and has
no `@Roles()` guard. Any authenticated student could, in principle, call this
endpoint directly to self-approve a payment.

### H3. Bus-tracking WebSocket gateway has no authentication — confirmed-issue
`BusTrackingGateway` (`backend/src/modules/bus-tracking/bus-tracking.gateway.ts:11-18`)
is configured `cors: {origin: '*', credentials: true}` with no handshake
auth/guard, and both emit methods `server.emit(...)` broadcast to **every**
connected socket with no room/target filtering. The REST endpoints that write
location data are correctly role-guarded (`@Roles('Driver')`,
`@Roles('Admin','MovementManager')`, etc.), but the socket channel that
broadcasts the resulting locations is open to any client that can reach the
`/tracking` namespace — meaning live bus GPS data is not actually restricted to
authorized roles in practice.

### H4. Two parallel write paths onto the `tripbookings` collection — confirmed-issue
`TripBookingModule`/`TripBookingService` (validated, updates `Trip.bookedSeats`)
and `BookingsModule` (direct Mongoose model access, bypasses that logic) both
remain live, both are called from the frontend (`bookingAPI` in `lib/api.ts`,
marked "legacy" in a source comment). Using the `Bookings` path to create a
booking does not increment `Trip.bookedSeats`, silently desynchronizing seat
counts from actual bookings over time.

### H5. Booking creation/cancellation is not transactional and has no visible capacity check — likely-issue
`TripBookingService.create()`
(`backend/src/modules/trip-booking/trip-booking.service.ts:48-56`) does two
sequential, unguarded writes (insert booking, then `$inc bookedSeats`) with no
Mongoose session/transaction, and no comparison of `bookedSeats` against bus
capacity was found in this method. Concurrent bookings near capacity could
result in overbooking; a hard failure between the two writes could leave a
booking without a corresponding seat increment. Needs-verification: whether
capacity is enforced elsewhere (e.g. frontend-only, or a check this analysis
didn't locate) — if enforcement is frontend-only, it is not a real safeguard.

## Medium

### M1. `settingsAPI` in the frontend is a hardcoded stub — confirmed-issue
`frontend/src/lib/api.ts` (`settingsAPI.get`, `.update`, `.getMaintenanceMode`,
around lines 1257-1273) never calls the network — `get()` returns a fixed
object, `update()` no-ops and returns `{success:true}`, and
`getMaintenanceMode()` always returns `{maintenanceMode:false}`. Consequences:
(a) the maintenance-mode login block in `useAuth.login()`
(`frontend/src/hooks/useAuth.ts:116-127`) can never actually trigger — the
feature is silently non-functional; (b) the real backend `Settings` module
(correctly implemented, with a genuinely public
`GET /api/Settings/maintenance-mode`) is effectively unreachable from the
current UI; (c) any admin "system settings" page relying on this exact client
function cannot persist real changes. Needs-verification: whether the admin
settings page (`frontend/src/app/dashboard/admin/settings/page.tsx`) calls a
different, non-stubbed path for the branding/maintenance fields it edits.

### M2. Frontend `frontend/src/app/api/*` is a large disconnected legacy mock backend — confirmed-issue
~58 Next.js Route Handlers read/write a `db.json` file
(e.g. `frontend/src/app/api/bookings/route.ts:50-51,80-81,193`) that does not
exist anywhere in the repository. `frontend/src/lib/config.ts`'s `buildUrl()`
explicitly throws if any endpoint starts with `/api`, structurally preventing
the live API client from ever reaching this tree. This is dead weight (~58
files) that could confuse future maintainers into thinking it's the live API
layer. One loose end: `frontend/src/hooks/useTripMapping.ts` makes a raw
`fetch('/api/Trip', ...)` call that bypasses `lib/api.ts` and could theoretically
still reach this dead tree if that hook is live — needs-verification.

### M3. No rate limiting, CAPTCHA, or brute-force protection on auth endpoints — confirmed-issue (absence)
`login`, `registration-student`, `registration-staff`, `forgot-password`, and
`verification` are all `@Public()` with no throttling guard
(`@nestjs/throttler` or equivalent is not a dependency) and no CAPTCHA anywhere
in the frontend forms. Combined with C1, this materially lowers the effort
required to exploit the staff-registration issue and also permits unlimited
login/verification-code guessing attempts (6-digit codes, no lockout).

### M4. Verification and reset codes are checked by plain string equality, not constant-time comparison — likely-issue
`authentication.service.ts` (`verifyEmail`, `forgotPassword`/`resetPassword`)
compares `user.verificationCode !== dto.verificationCode` and
`user.resetToken !== dto.resetToken` directly. For 6-digit numeric codes this
is a low-severity timing-attack surface in practice (small keyspace makes
timing attacks less relevant than brute force, which is already covered by
M3), but is worth noting alongside M3.

### M5. Uploaded profile pictures are never cleaned up on replacement — confirmed-issue
`UsersService.updateProfilePicture()` stores the new URL string with no
deletion of the previous file (`backend/src/modules/users/users.controller.ts:98-120`
+ service). Orphaned files accumulate indefinitely in `backend/uploads/` /
the persistent `/var/lib/elrenad/uploads` symlink target in production —
unbounded disk growth over the system's lifetime, and the admin database-purge
feature explicitly does not touch the filesystem (by design, per the commit
message), so purging the database does not reclaim this space either.

### M6. No security headers in the Nginx template — confirmed-issue
`deploy/nginx/el-renad.conf.template` has no HSTS, CSP, X-Frame-Options,
X-Content-Type-Options, or Referrer-Policy directives. The only protections
present are a dotfile-deny rule and (post-certbot) the forced HTTPS redirect.

### M7. `DbMigrationService`'s hardcoded collection list will silently miss future collections — architectural-concern
`backend/src/common/services/db-migration.service.ts` scans a fixed list of 12
collection names for missing `numericId` backfill. Any new schema added later
must be manually added to this list (as already happened once — `bus_locations`
uses a different ID scheme and was correctly excluded, but a future mistake
here would go unnoticed since there's no test covering it).

### M8. `AdminSystemModule` requires manual maintenance to stay complete — architectural-concern
The purge feature enumerates 12 business collections by hand
(`backend/src/modules/admin-system/admin-system.service.ts:141-154`). Any new
business collection added to the system in the future will **not** be purged
by "Delete All Database Data" unless a developer remembers to add it here —
this is inherent to the no-`ref`/manual-relationship architecture (see
`06-database-model.md`) and is the tradeoff of not having a
schema-registry-driven or reflection-based purge mechanism.

## Low

### L1. Two parallel, inconsistent i18n systems — confirmed-issue
`LanguageContext`/`useI18n` (JSON-file-backed, actually wired into
`layout.tsx`) coexists with `useLanguage.ts` (hardcoded translation object,
syncing through the stubbed `settingsAPI`). `i18next`/`react-i18next` are
installed dependencies with zero confirmed usage in the live component tree.
Consolidation would reduce maintenance burden and translation drift risk.

### L2. Heavy `console.log` instrumentation in `lib/api.ts`, including partial token logging — confirmed-issue
`frontend/src/lib/api.ts` logs request URLs, bodies, and truncated tokens
across nearly every exported function. `ConsoleSilencer`
(`frontend/src/components/layout/ConsoleSilencer.tsx`) exists to suppress
console output in some environments, and commit `48be6a1`'s message notes it
previously had a bug "suppressing console.error in every environment,
including production" — worth re-verifying the current silencer configuration
actually leaves warnings/errors visible in production while suppressing the
verbose request/response logs (needs-verification on the exact current
behavior post-fix).

### L3. `useTripMapping.ts` hardcodes driver/conductor IDs — needs-verification
`frontend/src/hooks/useTripMapping.ts` substitutes fixed
`workingDriverId: 2` / `workingConductorId: 3` into trip creation regardless of
UI selection, storing the real selection only in a `notes` field. If this hook
is still wired into the live trip-creation flow, every trip created through it
would have incorrect driver/conductor assignments in the structured fields.
Needs-verification: confirm whether `TripForm.tsx` (the apparently-current,
zod-validated trip form) still imports this hook or has superseded it.

### L4. Backend leftover interceptor is dead code — confirmed-issue
`backend/src/common/interceptors/response.interceptor.ts` exists but is never
registered as `APP_INTERCEPTOR` in `app.module.ts` — unused.

### L5. Dev/debug pages reachable in production — confirmed-issue
`/simple-test`, `/test-endpoints`, `/test-trip-fixed` under `frontend/src/app/`
are reachable by any authenticated user in production (middleware only checks
for a login cookie, not route allowlisting by environment). Low risk if they
don't expose sensitive data, but should be confirmed and likely removed or
gated behind a non-production build flag.

### L6. Frontend `app/api/auth/logout/route.ts` is vestigial — confirmed-issue
Clears cookies named `auth-token`/`refresh-token`, which are not the cookie the
live app actually uses (`user`, managed directly in `useAuth.ts` and
`lib/api.ts`). Dead code within the already-dead `app/api/*` tree, called out
individually because it could mislead a future developer debugging logout
behavior into looking in the wrong place.

## Informational

### I1. `@nestjs/swagger` is installed but not wired up — needs-verification
No `SwaggerModule.setup(...)` call was found in `backend/src`. If API
documentation is desired, this dependency is already present but unused; if
intentionally removed, it could be dropped from `package.json`.

### I2. No automated tests protect the admin-purge feature or payment review logic — confirmed-issue
See `12-testing.md`. Given C1, H1, and H2 above, the complete absence of
automated tests around authentication, authorization, and the purge feature
means regressions in exactly these high-stakes areas would not be caught
automatically.

### I3. The `numericId` pattern is a deliberate, unusual architectural choice — architectural-concern
No Mongoose `ref:`/`populate()` relationship exists anywhere in the codebase;
every cross-collection reference is a manually-resolved `numericId` lookup (see
`06-database-model.md`). This is consistent throughout and clearly intentional,
but it means referential integrity, cascade behavior, and "join" performance
are all the application's responsibility rather than the database's — worth
flagging as a standing tradeoff for anyone extending the schema.

### I4. README claims Jest is used "for testing" without qualifying that only a single live-server E2E spec exists and isn't wired to `npm test` — confirmed-issue (documentation accuracy, not a code risk)
See `12-testing.md`.
