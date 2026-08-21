# 01 — Project Overview

## What this is

El Renad (الريناد) is a university transportation management system:
students book seats on scheduled bus trips, pay for time-boxed subscription
plans (reviewed manually by an admin), drivers broadcast live GPS location,
staff take attendance, and admins run daily voting/surveys, manage the fleet,
and can (as of commit `6c83648`) hard-purge all business data from the admin
settings screen.

Confirmed identity: `backend/package.json:2` (`"name": "bus-system-backend"`,
`"description": "NestJS backend for Bus Management System"`), `README.md`,
`DEPLOY_VPS_AR.md`, `deploy/lib/config.sh:10` (`DOMAIN_PRIMARY="el-renad.com"`),
and `backend/src/modules/settings/settings.service.ts:14` (default
`systemName: 'El Renad'`).

## Repository shape

This is a **polyrepo-in-one-checkout**, not a managed monorepo (no
Nx/Turborepo/Lerna/pnpm-workspace config anywhere). Three independent
top-level projects share one git history:

- `backend/` — standalone NestJS 10 application, own `package.json`,
  `node_modules`, `tsconfig.json`, `nest-cli.json`, `jest.config.js`.
- `frontend/` — standalone Next.js 15 application, own `package.json`,
  `node_modules`, `tsconfig.json`.
- `deploy/` — bash automation that builds and wires both of the above
  together on a single VPS via systemd + nginx; not a package/app itself.

They communicate purely over HTTP/WebSocket at runtime (frontend → backend
REST at `/api/*`, and a Socket.IO `/tracking` namespace) — there is no shared
TypeScript package, no code generation, no OpenAPI-derived client. Types are
hand-duplicated in `frontend/src/types/*.ts` to mirror backend DTOs/schemas.

## Technology stack

### Backend (`backend/`)

| Concern | Choice | Evidence |
|---|---|---|
| Framework | NestJS 10.4 | `backend/package.json:14-24` (`@nestjs/core ^10.4.0`) |
| Language | TypeScript 5.3, compiled via `nest build` | `backend/package.json:8`, `nest-cli.json` |
| Database / ODM | MongoDB via Mongoose 8.2 (`@nestjs/mongoose`) | `backend/src/app.module.ts:35-41` |
| Auth | JWT (`@nestjs/jwt` + `passport-jwt`), bcrypt password hashing | `backend/src/modules/authentication/jwt.strategy.ts`, `authentication.service.ts:48` |
| Validation | `class-validator` + `class-transformer`, global `ValidationPipe` | `backend/src/main.ts:31-47` |
| Realtime | `@nestjs/websockets` + `socket.io` (Socket.IO gateway) | `backend/src/modules/bus-tracking/bus-tracking.gateway.ts` |
| Scheduling | `@nestjs/schedule` (`@Cron`) | `backend/src/modules/trips/trips.service.ts:276` |
| File uploads | `multer` via `@nestjs/platform-express` `FileInterceptor` | `backend/src/modules/users/users.controller.ts:98-110` |
| Email | `nodemailer` (Gmail SMTP) | `backend/src/modules/authentication/email.service.ts:11-17` |
| API docs | `@nestjs/swagger` is a dependency but **not wired up** in `main.ts` — no `SwaggerModule.setup(...)` call found anywhere in `backend/src` | (absence confirmed by search) |
| Testing | Jest 30 + `ts-jest` + `supertest`, one E2E spec | `backend/jest.config.js`, `backend/test/api.e2e-spec.ts` |

### Frontend (`frontend/`)

| Concern | Choice | Evidence |
|---|---|---|
| Framework | Next.js 15.4.6, **App Router** (`src/app`), React 19.1 | `frontend/package.json:18,25-26` |
| Language | TypeScript 5 | `frontend/package.json:44` |
| Styling | Tailwind CSS v4 (`@tailwindcss/postcss`) | `frontend/package.json:39,45` |
| State management | No Redux/Zustand/Jotai. Plain React Context (`AuthProvider`, `LanguageProvider`) + local component state + hooks | `frontend/src/hooks/useAuth.ts`, `frontend/src/contexts/LanguageContext.tsx` |
| Data fetching | Hand-rolled `fetch` wrapper (`api.ts`), no React Query/SWR | `frontend/src/lib/api.ts:84-281` |
| Forms/validation | `react-hook-form` + `@hookform/resolvers` with both `yup` and `zod` present as deps (mixed usage) | `frontend/package.json:15,17,51,53` |
| i18n | Two parallel systems present: (1) a custom lightweight loader (`lib/i18n.ts` + `contexts/LanguageContext.tsx`, JSON dictionaries under `src/locales/{en,ar}/common.json`) actually wired into `app/layout.tsx`; (2) `i18next`/`react-i18next` are dependencies with a `components/providers/I18nProvider.tsx` and `en.json`/`ar.json` at `src/locales/` root — needs verification which is authoritative (see doc 03) | `frontend/src/app/layout.tsx:41`, `frontend/src/lib/i18n.ts` |
| Maps | `mapbox-gl` / `react-map-gl` | `frontend/src/components/maps/MapboxMap.tsx`, `frontend/src/lib/constants.ts:42` |
| Realtime client | `socket.io-client` | `frontend/src/hooks/useBusTracking.ts:4` |
| Charts | `chart.js` / `react-chartjs-2` | `frontend/src/components/charts/*` |
| Animation | `framer-motion`, `gsap`, `@react-three/fiber` (present, usage not exhaustively traced) | `frontend/package.json` |
| Auth | No dedicated auth library — custom `AuthProvider` storing a JWT in `localStorage`/cookie | `frontend/src/hooks/useAuth.ts:130-141` |

### Deployment (`deploy/`)

Single-VPS deployment (Ubuntu 24.04): Nginx reverse proxy in front of two
systemd services (NestJS on `127.0.0.1:7126`, Next.js on `127.0.0.1:3000`),
local MongoDB, Let's Encrypt via certbot. See doc 11 for the full pipeline.

## Domain model at a glance

Core entities (all Mongoose collections, `backend/src/modules/*/*.schema.ts`):
`User` (roles: Admin/Student/Driver/Conductor/MovementManager), `Bus`,
`TripRoute`/`Routes`, `Trip`, `TripBooking`, `SubscriptionPlan`,
`StudentSubscription`, `Payment`, `Notification`, `Attendance`, `BusLocation`,
`VotingSurvey`/`VoteResponse`, `Setting`. Full schema detail in doc 06.
