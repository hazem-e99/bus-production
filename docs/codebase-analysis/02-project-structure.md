# 02 — Project Structure

## Repository root

```
production2026/
├── backend/            NestJS 10.4 REST + WebSocket API (MongoDB/Mongoose)
├── frontend/           Next.js 15.4.6 App Router application
├── deploy/             Bash deployment tooling (single VPS, systemd + nginx)
├── docs/               This documentation set (docs/codebase-analysis/)
├── README.md           Project overview, confirms production status
├── DEPLOY_VPS_AR.md    Arabic VPS deployment guide (mirrors deploy/deploy.sh)
├── .gitignore          Root safety net; ignores .env*, allows .env.example
└── .gitattributes      Forces LF endings on deploy/*.sh, *.template, scripts/*.js
```

## `backend/` — NestJS application

```
backend/
├── src/
│   ├── main.ts                    Bootstrap: CORS, ValidationPipe, static /uploads
│   ├── app.module.ts              Root module: 19 feature modules + global guards/filter
│   ├── common/                    Cross-cutting: guards, decorators, filters, exceptions
│   │   ├── decorators/            @Public(), @Roles(), @CurrentUser()
│   │   ├── guards/                JwtAuthGuard, RolesGuard
│   │   ├── filters/                AllExceptionsFilter (global error normalizer)
│   │   ├── exceptions/            AppException, ErrorCodes enum
│   │   ├── interfaces/            ApiResponse<T> envelope + factories
│   │   ├── utils/                 format-validation-errors.ts
│   │   ├── interceptors/          response.interceptor.ts (present but NOT wired — dead)
│   │   └── services/              DbMigrationService (backfills numericId on boot)
│   └── modules/                   19 feature modules (see 04-backend-architecture.md)
│       ├── authentication/        Login, register, verify, forgot/reset password
│       ├── users/                 User CRUD, profile, change-password, avatar upload
│       ├── buses/                 Fleet CRUD
│       ├── trips/                 Trip CRUD + @Cron auto-status-transition job
│       ├── trip-booking/          Student trip bookings (primary booking write path)
│       ├── bookings/              Second, parallel booking CRUD (bypasses trip-booking)
│       ├── payment/                Manual/offline payment records + admin review
│       ├── notifications/         Per-user + broadcast notifications
│       ├── subscription-plan/     Subscription plan catalog
│       ├── student-subscription/  Student's active/expired subscriptions
│       ├── routes/                Route CRUD (start/end/stops)
│       ├── trip-routes/           Thin duplicate wrapper over RoutesService
│       ├── attendance/            Per-trip attendance records
│       ├── student-dashboard/     Aggregated stats for a given student
│       ├── settings/              System settings + public maintenance-mode flag
│       ├── forms/                 Static public lookup lists (departments, etc.)
│       ├── bus-tracking/          GPS location REST + Socket.IO gateway
│       ├── voting/                Surveys with daily-recurrence voting windows
│       └── admin-system/          Admin-only destructive database purge
├── test/
│   └── api.e2e-spec.ts            Live black-box E2E suite (requires running server)
├── scripts/
│   └── bootstrap-admin.js         Idempotent production admin account bootstrap
├── seed.js                        Standalone dev/demo data seeder (raw mongodb driver)
├── uploads/                       Multer disk storage target, served at /uploads/
├── jest.config.js                 testRegex only matches *.e2e-spec.ts
├── nest-cli.json, tsconfig*.json  Nest/TS build config
├── package.json                   No "test" script despite jest/supertest deps
└── .env.example                   Documented in 10-configuration-environments.md
```

## `frontend/` — Next.js application

```
frontend/
├── src/
│   ├── app/                       App Router: one folder per route
│   │   ├── layout.tsx             Root layout: fonts, RTL cookie read, provider stack
│   │   ├── page.tsx                Public landing page
│   │   ├── error.tsx, global-error.tsx   Route-level and root error boundaries
│   │   ├── auth/                  Public: login, register redirect, forgot/reset password
│   │   ├── register/              Public registration
│   │   ├── dashboard/             Auth-required; role subfolders (see 03-frontend-architecture.md)
│   │   │   ├── layout.tsx         Auth check + role-redirect + per-page ErrorBoundary
│   │   │   ├── admin/             Admin console pages (incl. settings/danger-zone purge UI)
│   │   │   ├── driver/            Driver dashboard, tracking, my-trips
│   │   │   ├── movement-manager/  Fleet ops, tracking, routes
│   │   │   ├── student/           Booking, subscription, voting
│   │   │   └── supervisor/        Attendance, trips
│   │   ├── trips/                 Auth-required, not role-scoped in the URL
│   │   ├── maintenance/           Shown when Settings.maintenanceMode is on
│   │   ├── simple-test/, test-endpoints/, test-trip-fixed/   Leftover dev/debug pages
│   │   └── api/                   ~58 Next.js Route Handlers — LEGACY MOCK BACKEND
│   │                              (reads/writes a nonexistent db.json; structurally
│   │                               unreachable from lib/api.ts; see 03 and 14 for detail)
│   ├── components/
│   │   ├── ErrorBoundary.tsx      Class component, app-wide + per-dashboard-page
│   │   ├── auth/, booking/, charts/, layout/, maps/, notifications/
│   │   ├── providers/I18nProvider.tsx
│   │   ├── trips/TripForm.tsx     react-hook-form + zod example
│   │   └── ui/                    18 design-system primitives (Radix-based)
│   ├── contexts/
│   │   └── LanguageContext.tsx    Primary i18n context (useI18n)
│   ├── hooks/
│   │   ├── useAuth.ts             AuthProvider: login/logout, localStorage + cookie
│   │   ├── useLanguage.ts         Second/legacy i18n implementation (duplicate)
│   │   ├── useBusTracking.ts      Socket.IO client + driver geolocation reporting
│   │   ├── useNotifications.ts    Notification CRUD/filtering
│   │   ├── useRTL.ts              Empty file (0 bytes)
│   │   └── useTripMapping.ts      Hardcodes driver/conductor IDs — needs verification
│   ├── lib/
│   │   ├── api.ts                 Central fetch-based API client (~1470 lines)
│   │   ├── apiError.ts            ApiError class + message/field-error helpers
│   │   ├── config.ts               buildUrl() — blocks any /api-prefixed endpoint
│   │   ├── env.ts                 API_CONFIG endpoint path constants
│   │   ├── backend-url.ts         Asset URL + tracking socket URL helpers
│   │   └── i18n.ts                Dictionary loader for LanguageContext
│   ├── locales/
│   │   ├── en/common.json, ar/common.json   Active locale files
│   │   └── en.json, ar.json        Older flat files (possibly superseded)
│   ├── services/
│   │   └── tripService.ts         Second, partially redundant trip API surface
│   ├── types/                     Hand-written TS types mirroring backend DTOs
│   ├── utils/
│   └── middleware.ts               Cookie-presence route guard (not JWT verification)
├── scripts/
│   └── translate-missing.mjs      i18n key diff/translate CLI (npm run i18n:check/translate)
├── next.config.ts                 images.unoptimized, remotePatterns from backend origin
├── package.json                   No "test" script; no test framework installed
└── .env.example                   Documented in 10-configuration-environments.md
```

## `deploy/` — deployment tooling

```
deploy/
├── deploy.sh               Orchestrator: 16 ordered, idempotent stages (see doc 11)
├── backup.sh                mongodump + uploads tar, 14-backup retention
├── restart.sh               Restart backend/frontend (or --all incl. nginx/mongod)
├── status.sh                 Read-only health/status snapshot
├── logs.sh                   journalctl wrapper for backend/frontend/nginx/mongo
├── lib/                      16 sourced bash modules (build, config, dns_ssl, env,
│                              firewall, healthcheck, log, mongo, nginx, packages,
│                              preflight, secrets, services, uploads)
├── nginx/
│   └── el-renad.conf.template   Reverse proxy: /api, /uploads, /socket.io, / (frontend)
└── systemd/
    ├── elrenad-backend.service.template
    └── elrenad-frontend.service.template
```

## Notable structural observations

- **No shared types/package** between `backend/` and `frontend/` — `frontend/src/types/*`
  hand-mirrors backend DTOs by convention only; there is no code generation or shared
  npm workspace linking them.
- **`frontend/src/app/api/*` is a legacy mock-backend tree** (json-server-style,
  reading/writing a `db.json` that does not exist in the repo) left over from an
  earlier prototyping phase; it is structurally unreachable from the live API client
  (`frontend/src/lib/config.ts` blocks any `/api`-prefixed call). See
  `03-frontend-architecture.md` and `14-risks-observations.md`.
- **`backend/src/modules/bookings/` and `backend/src/modules/trip-booking/` are two
  parallel write paths onto the same `tripbookings` collection** — `bookings` bypasses
  `TripBookingService`'s seat-count and validation logic. See `04-backend-architecture.md`.
- **`backend/src/modules/trip-routes/` is a thin duplicate of `routes/`**, wrapping the
  same `RoutesService` under a second URL prefix (`/api/TripRoutes`).
