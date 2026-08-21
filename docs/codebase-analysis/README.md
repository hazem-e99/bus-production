# El Renad (الريناد) — Codebase Analysis

This is a trace-based technical analysis of the repository at the project root
(`d:\MY-Project\production2026`), produced by reading source files directly
(backend `src/`, frontend `src/`, `deploy/`) rather than inferring behavior
from names. Every non-trivial claim below is backed by a `file:line` citation.

The system is **El Renad** (الريناد), a university/school bus transportation
management platform: student trip booking, subscription-based payments
(admin-reviewed, no live payment gateway), live GPS bus tracking over
WebSockets, attendance, notifications, and daily voting/surveys — with
role-based dashboards for Admin, Student, Driver, Conductor and
MovementManager.

## Documents in this set

| File | Contents |
|---|---|
| [01-project-overview.md](./01-project-overview.md) | Repo shape, architecture style, tech stack summary |
| [02-project-structure.md](./02-project-structure.md) | Annotated directory trees (frontend + backend) |
| [03-frontend-architecture.md](./03-frontend-architecture.md) | Next.js app: routing, layout, API layer, middleware, state |
| [04-backend-architecture.md](./04-backend-architecture.md) | NestJS app: startup, every module, common/shared code |
| [05-api-map.md](./05-api-map.md) | Full endpoint table with auth, frontend caller, usage status |
| [06-database-model.md](./06-database-model.md) | MongoDB collections, schemas, relationships |
| [07-authentication-authorization.md](./07-authentication-authorization.md) | Login/register/token flow, roles, admin purge guard |
| [08-business-flows.md](./08-business-flows.md) | End-to-end traces of 6 real workflows, with diagrams |
| [09-integrations.md](./09-integrations.md) | External services actually wired in (and what is NOT) |
| [10-configuration-environments.md](./10-configuration-environments.md) | `.env.example` variables (names/purpose only) |
| [11-deployment-infrastructure.md](./11-deployment-infrastructure.md) | `deploy/` pipeline, nginx, systemd |
| [12-testing.md](./12-testing.md) | What's tested vs not |
| [13-dependency-map.md](./13-dependency-map.md) | Central modules, coupling points |
| [14-risks-observations.md](./14-risks-observations.md) | Security/architecture findings, categorized by severity |
| [15-important-files.md](./15-important-files.md) | File-by-file importance table |

## Headline findings (see doc 14 for full detail)

- **The admin "database purge" feature (commit `6c83648`) is correctly
  defense-in-depth**: role-gated (`@Roles('Admin')`), requires the admin's
  live bcrypt-verified password plus an exact-match confirmation phrase
  server-side (not just client-side), and runs as a MongoDB transaction with
  a logged, non-atomic fallback only when transactions aren't supported. See
  `backend/src/modules/admin-system/admin-system.service.ts`.
- **The frontend ships a large second, unused backend**: `frontend/src/app/api/*`
  (around 45 Next.js Route Handlers — `admin-analytics`, `admin-bookings`,
  `student-stats`, etc.) read from a `db.json` file that does not exist
  anywhere in this repository, and no page or component calls them (verified
  by grep). The live app calls the NestJS backend directly from
  `frontend/src/lib/api.ts`. Treat this whole tree as legacy/dead code from
  an earlier prototype, with one exception: `app/api/image-proxy/route.ts` is
  live and proxied by nginx.
- **Several backend controllers have no `@Roles()` guard**, relying only on
  the global `JwtAuthGuard` (i.e. "any authenticated user"), including
  `UsersController` (`getById`, `updateUser`, `deleteUser`), `PaymentController`
  (`review`, `delete`, `getAll`), and others — see doc 14 for the full list.
- **No real payment gateway, SMS/OTP provider, or OAuth is integrated.**
  "Online"/"Offline" in `Payment.paymentMethod` are plain enum labels;
  payments are manually reviewed by an admin (`PaymentService.review`,
  `backend/src/modules/payment/payment.service.ts:90`). The only outbound
  integrations are Gmail SMTP (nodemailer, verification/reset emails) and
  Mapbox (map rendering only, not a backend integration).
