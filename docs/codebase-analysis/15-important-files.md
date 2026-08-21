# 15 — Important Files

| File | Layer | Responsibility | Related Feature | Importance |
|---|---|---|---|---|
| `backend/src/main.ts` | Backend bootstrap | CORS, global ValidationPipe, static `/uploads` serving, listen | App startup | Critical |
| `backend/src/app.module.ts` | Backend bootstrap | Registers all 19 modules, global guards/filter, Mongo connection | App startup, auth, error handling | Critical |
| `backend/src/common/guards/jwt-auth.guard.ts` | Backend auth | Global JWT verification, `@Public()` bypass, 401 mapping | Auth | Critical |
| `backend/src/common/guards/roles.guard.ts` | Backend auth | Global role check (no-op without `@Roles()`) | Auth | Critical |
| `backend/src/modules/authentication/authentication.service.ts` | Backend business logic | Login, registration (student/staff), verify, forgot/reset password | Auth | Critical |
| `backend/src/modules/authentication/authentication.controller.ts` | Backend API | Public auth routes; confirms `registration-staff` is `@Public()` | Auth | Critical (contains C1 risk) |
| `backend/src/modules/authentication/dto/staff-registration.dto.ts` | Backend validation | Allows caller-supplied `role` including `'Admin'` | Auth | Critical (contains C1 risk) |
| `backend/src/modules/authentication/jwt.strategy.ts` | Backend auth | Passport JWT strategy, re-fetches user per request | Auth | Critical |
| `backend/src/modules/admin-system/admin-system.service.ts` | Backend business logic | Database purge: confirmation phrase, password re-check, transactional delete | Admin console | Critical |
| `backend/src/modules/admin-system/admin-system.controller.ts` | Backend API | Class-level `@Roles('Admin')` gate for the purge endpoint | Admin console | Critical |
| `backend/src/common/filters/all-exceptions.filter.ts` | Backend cross-cutting | Normalizes every error response app-wide | Error handling | Critical |
| `backend/src/common/exceptions/error-codes.ts` | Backend cross-cutting | Stable error-code vocabulary | Error handling | High |
| `backend/src/common/interfaces/api-response.interface.ts` | Backend cross-cutting | Standard response envelope used by every service | All API responses | Critical |
| `backend/src/modules/users/user.schema.ts` | Backend data model | Central identity schema (all 5 roles, one polymorphic model) | Identity | Critical |
| `backend/src/modules/users/users.controller.ts` | Backend API | User CRUD, profile, upload — no `@Roles()` anywhere | User management | Critical (contains H1 risk) |
| `backend/src/modules/payment/payment.service.ts` | Backend business logic | Payment review triggers subscription creation/extension | Billing | High (contains H2 risk) |
| `backend/src/modules/trip-booking/trip-booking.service.ts` | Backend business logic | Booking create/cancel, non-transactional seat-count updates | Booking | High (contains H5 risk) |
| `backend/src/modules/bookings/bookings.controller.ts` | Backend API | Parallel, unsynchronized booking write path | Booking | High (contains H4 risk) |
| `backend/src/modules/bus-tracking/bus-tracking.gateway.ts` | Backend real-time | Unauthenticated Socket.IO broadcast of live GPS data | Live tracking | High (contains H3 risk) |
| `backend/src/modules/bus-tracking/bus-tracking.controller.ts` | Backend API | Role-guarded REST endpoints feeding the gateway | Live tracking | High |
| `backend/src/modules/trips/trips.service.ts` | Backend business logic | Only `@Cron` job in the codebase (auto trip-status transition) | Fleet ops | High |
| `backend/src/common/services/db-migration.service.ts` | Backend cross-cutting | Backfills `numericId` on boot for a hardcoded collection list | Data integrity | Medium |
| `backend/scripts/bootstrap-admin.js` | Backend ops | Idempotent production admin account creation | Deployment | High |
| `backend/seed.js` | Backend ops | Standalone dev/demo data seeder | Dev/testing | Medium |
| `backend/test/api.e2e-spec.ts` | Backend testing | The only automated test coverage in the repo | Testing | High |
| `backend/.env.example` | Backend config | Documents required/optional env vars | Configuration | High |
| `frontend/src/middleware.ts` | Frontend routing | Edge cookie-presence route guard (not JWT verification) | Auth/routing | Critical |
| `frontend/src/hooks/useAuth.ts` | Frontend state | Session lifecycle: login, logout, localStorage + cookie management | Auth | Critical |
| `frontend/src/lib/api.ts` | Frontend data layer | Central fetch-based API client for the entire app (~1470 lines) | Everything | Critical |
| `frontend/src/lib/config.ts` | Frontend data layer | `buildUrl()` — blocks any `/api`-prefixed call, enforcing backend-only routing | API layer | High |
| `frontend/src/lib/apiError.ts` | Frontend data layer | `ApiError` class, message/field-error normalization | Error handling | High |
| `frontend/src/app/layout.tsx` | Frontend entry point | Root layout: fonts, RTL cookie read, provider stack | App shell | Critical |
| `frontend/src/app/dashboard/layout.tsx` | Frontend routing | Auth check + role-redirect + per-page ErrorBoundary | Dashboard shell | High |
| `frontend/src/app/dashboard/admin/settings/page.tsx` | Frontend UI | Danger Zone: database-purge confirmation modal | Admin console | Critical |
| `frontend/src/contexts/LanguageContext.tsx` | Frontend state | Primary, live i18n context | i18n | High |
| `frontend/src/hooks/useLanguage.ts` | Frontend state | Second, duplicate i18n implementation | i18n | Medium (tech debt) |
| `frontend/src/hooks/useBusTracking.ts` | Frontend real-time | Socket.IO client, driver geolocation reporting | Live tracking | High |
| `frontend/src/hooks/useTripMapping.ts` | Frontend business logic | Hardcodes driver/conductor IDs — needs-verification if still live | Trip creation | Medium (contains L3 risk) |
| `frontend/src/components/ErrorBoundary.tsx` | Frontend cross-cutting | App-wide and per-page render-crash safety net | Error handling | High |
| `frontend/src/components/ui/PageState.tsx` | Frontend cross-cutting | Loading/Error/Empty state primitives | Error handling | Medium |
| `frontend/src/components/trips/TripForm.tsx` | Frontend UI | react-hook-form + zod validation example, trip create/edit | Fleet ops | Medium |
| `frontend/src/services/tripService.ts` | Frontend data layer | Second, partially redundant trip API surface | Fleet ops | Medium (tech debt) |
| `frontend/src/app/api/*` (≈58 route files) | Frontend (dead) | Legacy mock backend reading a nonexistent `db.json` | None (legacy) | Low / cleanup candidate |
| `frontend/.env.example` | Frontend config | Documents required/optional env vars | Configuration | High |
| `deploy/deploy.sh` | Infra | 16-stage idempotent deployment orchestrator | Deployment | Critical |
| `deploy/lib/secrets.sh` | Infra | One-time secret generation (JWT secret, Mongo password, admin password) | Deployment/security | Critical |
| `deploy/lib/mongo.sh` | Infra | MongoDB install, localhost lockdown, dedicated app user creation | Deployment/security | Critical |
| `deploy/nginx/el-renad.conf.template` | Infra | Reverse proxy routing for `/api`, `/uploads`, `/socket.io`, frontend | Deployment | Critical |
| `deploy/systemd/elrenad-backend.service.template` | Infra | Backend process supervision, hardening flags | Deployment | High |
| `deploy/systemd/elrenad-frontend.service.template` | Infra | Frontend process supervision, loopback-only bind | Deployment | High |
| `docs/codebase-analysis/*` | Documentation | This analysis set | Documentation | N/A |
