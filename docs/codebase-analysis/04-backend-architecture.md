# 04 — Backend Architecture

Source: `backend/` (NestJS 10.4, Mongoose 8.2/MongoDB). All findings below are based
on direct reads of `backend/src/main.ts`, `backend/src/app.module.ts`,
`backend/src/common/**`, and every module under `backend/src/modules/**`.

## Startup flow

`backend/src/main.ts`:
1. `NestFactory.create<NestExpressApplication>(AppModule)` (line 12).
2. Reads `PORT` (default 7126) and `CORS_ORIGIN` from `ConfigService`, builds a
   dedup'd origin list always including `http://localhost:3000` and `:3001` (lines
   14-22), then calls `app.enableCors(...)` (lines 24-29) with
   `credentials: true` and an explicit allowed-headers list.
3. Registers a global `ValidationPipe` (lines 31-44): `transform: true`,
   `whitelist: true`, `forbidNonWhitelisted: true`, `skipMissingProperties: false`,
   and a custom `exceptionFactory` that formats class-validator errors via
   `formatValidationErrors()` and throws a 422 `AppException` with code
   `VALIDATION_ERROR`.
4. Resolves `UPLOAD_DIR` (default `./uploads`), creates it if missing, and serves it
   statically at the `/uploads/` prefix via `app.useStaticAssets()` (lines 46-56).
5. Listens on `HOST`:`PORT` if `HOST` is set, else just `PORT` (lines 58-62).

`backend/src/app.module.ts`:
- `ConfigModule.forRoot({ isGlobal: true })` (line 32).
- `ScheduleModule.forRoot()` (line 34) — enables `@Cron`/`@Interval` decorators
  app-wide (only one consumer exists — see Scheduling below).
- `MongooseModule.forRootAsync(...)` (lines 35-42) connects using `MONGODB_URI`
  from config.
- Imports all 19 feature modules (lines 44-51 in the summarized list; actual file
  order lines ~14-31 import statements, ~44-62 module array).
- Global providers (lines ~64-68): `AllExceptionsFilter` as `APP_FILTER`,
  `JwtAuthGuard` and `RolesGuard` (in that order) as `APP_GUARD`, and
  `DbMigrationService` as a plain provider (not global-scoped, but runs on every
  boot via its own lifecycle hook — see below).

## Common / shared infrastructure (`backend/src/common/`)

### Decorators
- `common/decorators/public.decorator.ts` — `Public()` sets metadata key
  `'isPublic'`, read by `JwtAuthGuard`.
- `common/decorators/roles.decorator.ts` — `Roles(...roles: string[])` sets
  metadata key `'roles'`, read by `RolesGuard`.
- `common/decorators/current-user.decorator.ts` — `CurrentUser(field?)` param
  decorator pulls `request.user` (set by the Passport JWT strategy); an optional
  `field` argument extracts one property (e.g. `'userId'`, `'numericId'`).

### Guards (both global via `APP_GUARD` — every route protected unless `@Public()`)
- `common/guards/jwt-auth.guard.ts` — extends `AuthGuard('jwt')`.
  `canActivate` short-circuits to `true` when `@Public()` metadata is present
  (handler then class). `handleRequest` maps auth failures to `AppException`s:
  expired token → 401 `AUTH_TOKEN_EXPIRED`; missing → 401 `AUTH_TOKEN_MISSING`;
  otherwise → 401 `AUTH_TOKEN_INVALID`.
- `common/guards/roles.guard.ts` — reads `@Roles()` metadata (handler then class);
  if none present, allows; otherwise does a case-insensitive, trimmed match
  against `user.role` from the JWT-derived request user; throws
  `ForbiddenException` if no match or no user present.

### Global error handling
- `common/filters/all-exceptions.filter.ts` (`AllExceptionsFilter`, `APP_FILTER`) —
  catches every exception app-wide and normalizes to
  `{success:false, message, errorCode, errors, requestId}`. Special-cases:
  `AppException` (passes through status/code/errors), generic `HttpException`
  (maps status→code via `statusToErrorCode`), Mongoose `CastError` → 400
  `INVALID_ID`, Mongoose `ValidationError` → 422 `VALIDATION_ERROR` with per-field
  messages, Mongo duplicate-key error (code 11000) → 409 `DUPLICATE_RESOURCE`,
  `MulterError` (`LIMIT_FILE_SIZE` → 400 `FILE_TOO_LARGE`, else 400
  `BAD_REQUEST`), fallback → 500 `INTERNAL_SERVER_ERROR`. Logs 5xx with stack
  trace, 4xx as warnings; attaches `detail.stack` only when
  `NODE_ENV !== 'production'`.
- `common/exceptions/app.exception.ts` — `AppException extends HttpException`
  carrying a stable `code: ErrorCode` and optional `errors: Record<string,string>`.
- `common/exceptions/error-codes.ts` — the full stable error-code enum (auth,
  validation, purge, file, email, etc.) plus `statusToErrorCode()` fallback
  mapping.
- `common/interfaces/api-response.interface.ts` — the standard
  `ApiResponse<T> = {success, message, data, count?}` envelope and
  `createApiResponse`/`createErrorResponse` factories used throughout every
  service.
- `common/utils/format-validation-errors.ts` — flattens class-validator's nested
  `ValidationError[]` into `{field: message}`.
- `common/interceptors/response.interceptor.ts` — exists but is **not wired into
  `app.module.ts`** (no `APP_INTERCEPTOR` provider references it) — dead code.

### DB migration on boot
- `common/services/db-migration.service.ts` — `DbMigrationService implements
  OnApplicationBootstrap`, a plain provider (not global). On every app start it
  scans a fixed list of collections (`users, buses, trips, tripbookings, payments,
  notifications, subscriptionplans, studentsubscriptions, routes, attendance,
  voting_surveys, vote_responses`) for documents missing `numericId` and backfills
  them using the same `parseInt(_id.slice(-8),16) % 100000` scheme used
  everywhere else in the codebase. Note `bus_locations` is **not** in this list
  (`BusLocation` has no `numericId` field — it's keyed by `busId` directly).

## The `numericId` pattern (architecture-wide)

Nearly every schema has a `numericId: number` field (unique, indexed), derived in a
`pre('save')` Mongoose hook from the last 8 hex characters of the document's
`_id`, modulo 100000 (e.g. `backend/src/modules/payment/payment.schema.ts:44-48`).
Cross-collection references throughout the codebase are **numeric IDs looked up
via `Model.findOne({numericId})`**, not real Mongoose `ref`/`populate` relations —
no schema in the codebase declares an actual `ref:` relationship. This is a
deliberate but unusual design choice (likely to keep IDs short/URL-friendly and
stable across some earlier non-Mongo system), and it means:
- Referential integrity is enforced by application code, not the database.
- Every "join" is an extra round-trip query per related entity.
- `DbMigrationService` exists specifically to keep this derived field populated
  on documents that predate it or were created outside the normal `save()` path.

## Feature modules (`backend/src/modules/*`)

All modules follow the same layering: Controller → Service → Mongoose Model, with
DTOs validated by the global `ValidationPipe`. Most controllers have **no
`@Roles()` decorator**, relying only on the global `JwtAuthGuard` (i.e.
"authenticated, any role") — flagged per-module below and consolidated in
`14-risks-observations.md`.

### authentication
`api/Authentication` — all 6 routes `@Public()`: `login`, `registration-student`,
`registration-staff`, `verification`, `forgot-password`, `reset-password`. See
`07-authentication-authorization.md` for the full traced flow.
`authentication.module.ts` registers `JwtModule.registerAsync` (reads `JWT_SECRET`,
`JWT_EXPIRATION` default `'7d'`) and `PassportModule.register({defaultStrategy:
'jwt'})`, and exports `AuthenticationService`, `JwtModule`, `PassportModule` for
reuse.

### users
`api/Users` — **no `@Roles()`/`@UseGuards()` anywhere in this controller**
(`backend/src/modules/users/users.controller.ts`) — every route relies solely on
the two global guards. This means **any authenticated user of any role can**:
`GET /api/Users` (list all users), `GET /api/Users/:id` (fetch any user),
`DELETE /api/Users/:id` (delete any user), `PATCH /api/Users/:id` (patch any
user's fields). Profile-picture upload
(`PUT /api/Users/update-profile-picture`, lines 98-120) uses `FileInterceptor`
with a 5MB limit and a mimetype allowlist (jpeg/png/webp/gif).
`users.module.ts` registers `MulterModule.register({dest: './uploads'})` — default
disk storage with Multer's auto-generated random filenames (no custom
`diskStorage` filename function). `changePassword` verifies `currentPassword` via
bcrypt before allowing a change; `updateProfilePicture` just stores the given URL
string with no old-file cleanup (orphaned upload files accumulate over time).

### buses
`api/Buses` — plain CRUD, **no `@Roles()` guards at all** (open to any
authenticated user, including deleting/creating buses). Schema: `busNumber`
(unique), `speed`, `capacity`, `status` enum, `fuelLevel`, `location: {lat, lng}`.

### trips
`api/Trip` — CRUD plus search/filter routes, **no `@Roles()` guards**. Schema
includes embedded `stopLocations[]` sub-schema, `bookedSeats`, numeric
`busId`/`driverId`/`conductorId` refs. Houses the codebase's only scheduled job:
`@Cron(CronExpression.EVERY_MINUTE) handleTripStatusCron()`
(`backend/src/modules/trips/trips.service.ts:276-321`) — finds trips with
`status:'Scheduled'`, `tripDate` = today, and `departureTimeOnly <= now`, bulk
transitions them to `InProgress`, then best-effort notifies the driver and
conductor (errors swallowed).

### trip-booking
`api/TripBooking` — the primary student booking write path. `create()`
increments `trip.bookedSeats`; `cancel()` decrements it — **these two writes
(booking mutation + trip seat-count update) are not wrapped in a transaction**, a
possible race condition under concurrent bookings/cancellations (see
`14-risks-observations.md`). No `@Roles()` guards.

### bookings
`api/Bookings` — a **second, parallel CRUD surface over the same `tripbookings`
collection**, injecting the Mongoose model directly rather than reusing
`TripBookingService`. It therefore bypasses `TripBookingService`'s seat-count
increment/decrement and eligibility-check logic entirely — a real data-consistency
risk if both paths are used interchangeably by the frontend.

### payment
`api/Payment` — manual/offline payment records (no gateway integration; see
`09-integrations.md`). `review()` (`payment.service.ts` around line 90-138), when
called with an `Accepted` decision, **auto-creates or extends a
`StudentSubscription`** — real cross-module business logic triggered by a status
change, not just a field update. **No `@Roles()` guard on the controller** — any
authenticated user can call `PUT /api/Payment/:id/review` or `DELETE
/api/Payment/:id`, which is a significant authorization gap given this endpoint
approves/rejects money-related records.

### notifications
`api/Notifications` — per-user notifications plus `broadcast()` (inserts one
document per user via `insertMany`). Soft-delete via `isDeleted`. Has DTOs with
class-validator (`CreateNotificationDto`, `BroadcastNotificationDto`). **No
`@Roles()` guards** — any authenticated user can call the `admin/*` sub-routes
(`GET admin/all`, `DELETE admin/:id`) and `broadcast`.

### subscription-plan / student-subscription
Plain CRUD for the plan catalog and a student's subscription records
(`Active|Expired|Cancelled|Suspended|PendingActivation|PendingPayment`). No
`@Roles()` guards on either controller.

### routes / trip-routes
`routes/route.schema.ts`: `name, startLocation, endLocation, distance,
estimatedTime, stopLocations: string[]`. `trip-routes` has **no schema/service of
its own** — `trip-routes.module.ts` imports `RoutesModule` and
`trip-routes.controller.ts` directly wraps `RoutesService`, exposing a duplicate
`/api/TripRoutes` surface over the same `routes` collection; its `getAll` accepts
`page/pageSize/name/...` query params but ignores them (unimplemented filtering).

### attendance
`api/Attendance` — plain CRUD (`Present/Absent/Late/Excused`), no `@Roles()`
guards.

### student-dashboard
`api/StudentDashboard` — no own schema; aggregates `TripBooking`/`Trip`/
`Payment`/`StudentSubscription` models directly for `:studentId`-scoped stats.
**The `:studentId` route parameter is not checked against the requesting user's
own ID** — any authenticated caller can view any student's dashboard stats by
guessing/enumerating IDs (no ownership check, no `@Roles()` restriction either).

### settings
`api/Settings` — singleton settings document (`systemName, logo, primaryColor,
secondaryColor, maintenanceMode, maintenanceMessage`).
`GET /api/Settings/maintenance-mode` is `@Public()` (consumed by the frontend's
login flow to block non-admin logins during maintenance). The main `GET`/`PUT`
require authentication but have **no `@Roles()` restriction** — any authenticated
user can change branding/maintenance-mode settings.

### forms
`api/Forms` — a single `@Public() GET` returning static enum/lookup lists
(departments, statuses, roles) for frontend dropdowns. No schema/service beyond
this.

### bus-tracking
`api/BusTracking` — REST + Socket.IO gateway (`BusTrackingGateway`, namespace
`/tracking`). Route-level guards are actually applied here (unlike most other
modules): `POST location` / `POST stop/:busId` → `@Roles('Driver')`;
`GET location/:busId` → `@Roles('Admin','MovementManager','Driver')`;
`GET locations` → `@Roles('Admin','MovementManager')`; `GET locations/all` →
`@Roles('Admin')`. `stopTracking` additionally checks
`location.driverId !== driverId` and throws `ForbiddenException` — a driver can
only stop tracking on their own bus. `BusLocation` schema stores one document per
bus (upserted), with `driverId` stored as the Mongo `_id` **string** — an
inconsistency versus every other module's `numericId` convention.

The Socket.IO gateway itself (`bus-tracking.gateway.ts`) has **no authentication
on the socket handshake** — `cors: {origin: '*', credentials: true}`, and any
client that can reach the `/tracking` namespace receives every broadcast
(`server.emit`, no rooms/targeting). The REST controller manually invokes
`emitLocationUpdate`/`emitTrackingStopped` on the gateway after each successful
DB write — it is not an automatic Mongoose change-stream reaction.

### voting
`api/Voting` — `VotingSurvey` (embedded `SurveyQuestion[]`, types
multiple-choice/yes-no/rating/text, daily-recurrence window fields) and
`VoteResponse` with a **compound unique index `{surveyId, studentId,
voteDateKey}`** enforcing one vote per student per day per survey at the database
level. Real business logic: date/time-window validation, required-question
enforcement on submit, per-question analytics aggregation in
`getSurveyResults()`. Create/update/delete/toggle-active are `@Roles('Admin')`;
read/submit are open to any authenticated user.

### admin-system
`api/Admin/System` — the destructive database-purge feature (commit `6c83648`).
Fully traced in `07-authentication-authorization.md` and
`08-business-flows.md`. Controller-level `@Roles('Admin')`
(`backend/src/modules/admin-system/admin-system.controller.ts:14`) — the one
controller in the codebase that applies a class-level role guard rather than
relying on implicit "any authenticated user" behavior.

## Scheduling

Only one scheduled job exists in the entire backend, despite `ScheduleModule`
being registered globally: `TripsService.handleTripStatusCron()`
(`backend/src/modules/trips/trips.service.ts:276`), `@Cron(CronExpression.EVERY_MINUTE)`.

## WebSockets

Only one gateway: `backend/src/modules/bus-tracking/bus-tracking.gateway.ts`
(`BusTrackingGateway`, namespace `/tracking`) — see bus-tracking section above.

## API documentation tooling

`@nestjs/swagger` is a `backend/package.json` dependency but **is not wired up**
in `backend/src/main.ts` — no `SwaggerModule.setup(...)` call exists anywhere in
`backend/src`. There is no live Swagger/OpenAPI UI despite the dependency being
installed (needs-verification: confirm this isn't bootstrapped conditionally
somewhere not yet found, but no such call was located).
