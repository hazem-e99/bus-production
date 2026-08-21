# 03 — Frontend Architecture

## Entry point / root layout

`frontend/src/app/layout.tsx` is the App Router root layout (`RootLayout`,
`layout.tsx:29-50`):

1. Reads the `lang` cookie server-side via `next/headers` `cookies()`
   (`layout.tsx:30-32`) to set `<html lang dir>` before hydration (avoids
   flash of wrong direction for Arabic/RTL).
2. Loads two Google fonts: `Inter` (Latin) and `Cairo` (Arabic), switching
   `className` based on `lang` (`layout.tsx:14-15,35`).
3. Wraps children in, from outside in: `ErrorBoundary` →
   `AuthProvider` (`hooks/useAuth.ts`) → `ToastProvider`
   (`components/ui/Toast.tsx`) → `ConsoleSilencer` (dev-log suppression) →
   `ThemeInitializer` → `I18nProvider` (`components/providers/I18nProvider.tsx`,
   thin wrapper around `LanguageProvider`) → `LayoutShell` (`layout.tsx:36-46`).

`LayoutShell` (`components/layout/LayoutShell.tsx`) is the real "which chrome
do I show" decision point, not the root layout:
- Auth routes (`/auth/*`, `/register`, `/`) render children directly, no
  sidebar/topbar (`LayoutShell.tsx:18-30,43-49`).
- `/dashboard/*` and `/trips/*` render `Sidebar` + `Topbar` around children,
  but only once `user` is loaded (`LayoutShell.tsx:31-33,52-62`).
- A client-side effect redirects to `/auth/login` for any non-auth route when
  there is no authenticated user (`LayoutShell.tsx:36-40`) — this is in
  addition to the edge `middleware.ts` guard (defense in depth, see below).

## i18n — two systems present, one actually used

- **Live system**: `frontend/src/lib/i18n.ts` (dynamic `import()` of
  `src/locales/{en,ar}/common.json`) + `frontend/src/contexts/LanguageContext.tsx`
  (`LanguageProvider`/`useI18n`, cookie+localStorage persistence, sets
  `document.documentElement.lang/dir`). Wired into the tree via
  `components/providers/I18nProvider.tsx`, which is a two-line wrapper around
  `LanguageProvider` (`I18nProvider.tsx:6-9`). Almost every page/component
  calls `useI18n()` for the `t()` translator (e.g. `Sidebar.tsx:135`).
- **Unused dependency**: `i18next`, `react-i18next`,
  `i18next-browser-languagedetector`, `i18next-resources-to-backend` are all
  listed in `frontend/package.json:29-31` but a repo-wide search for
  `from 'i18next'`, `from 'react-i18next'`, and `useTranslation` found **zero
  matches** — confirmed unused. `src/locales/en.json`/`ar.json` (flat files
  at the locales root, distinct from `en/common.json`/`ar/common.json`) are
  also not imported anywhere found. Likely leftover from an earlier i18n
  approach that was replaced by the custom loader. Needs verification only in
  the sense that a dynamic/lazy import elsewhere could theoretically still
  reference them — none was found.
- `frontend/scripts/translate-missing.mjs` (behind `npm run i18n:check` /
  `i18n:translate`, `package.json:11-12`) is a standalone Node script that
  diffs `src/locales/{en,ar}/common.json` for missing keys and can
  auto-translate via Google/DeepL — it operates on the live-system files, not
  the unused i18next ones.

## Routing map (`src/app`)

App Router, file-based. Route groups below are inferred from directory
names; auth/protection column reflects `middleware.ts` + `LayoutShell`.

| Path | Purpose | Auth |
|---|---|---|
| `/` | Landing/welcome page | Public |
| `/auth/login`, `/auth/forgot-password`, `/auth/reset-password`, `/auth/reset-password-verification`, `/auth/new-password`, `/auth/verification` | Auth flows | Public |
| `/register` | Registration entry | Public |
| `/dashboard` | Redirect-only — bounces to `/dashboard/{role}` based on the `user` cookie (`middleware.ts:24-40`) or to `/dashboard/admin/users` for admins specifically (`app/dashboard/layout.tsx:26-27`) | Protected |
| `/dashboard/admin/*` (users, buses, tracking, plans, student-subscriptions, voting, notifications, settings, profile, routes, trips, trip-bookings, students/[id]) | Admin dashboard pages | Protected, admin-facing (not further role-checked client-side beyond `LayoutShell`'s generic "is there a user" gate — see doc 14) |
| `/dashboard/student/*` (book-trip, subscription, voting, notifications, profile) | Student dashboard | Protected |
| `/dashboard/driver/*` (my-trips, tracking, notifications, profile, trips) | Driver dashboard | Protected |
| `/dashboard/supervisor/*` (my-trips, attendance, attendance/[tripId], notifications, profile, trips) | Conductor/"Supervisor" dashboard (role name mismatch — backend role is `Conductor`, frontend path/label is `supervisor`, mapped in `useAuth.ts:88` `Conductor: 'supervisor'`) | Protected |
| `/dashboard/movement-manager/*` (buses, tracking, notifications, profile, routes, trips) | Movement manager dashboard | Protected |
| `/trips`, `/trips/[id]`, `/trips/create`, `/trips/edit/[id]` | Shared trip list/detail/create/edit, reused across roles via role checks inside the page | Protected |
| `/maintenance` | Shown when system settings `maintenanceMode=true` | Public |
| `/simple-test`, `/test-endpoints`, `/test-trip-fixed` | Developer/QA test pages, not part of the product | Protected (caught by middleware's default-protected rule) — **needs verification these are meant to ship to production** |

Route protection mechanism: `middleware.ts:4-77` runs at the edge, reading
the `user` cookie (JSON-stringified, set by `useAuth.ts:141` on login). It
allow-lists specific `publicRoutes` prefixes plus `/` (`middleware.ts:9-21`);
everything else redirects to `/auth/login` if the cookie is absent
(`middleware.ts:43-45`). It also fixes up mis-cased legacy dashboard URLs
(`/dashboard/Student` → `/dashboard/student`, etc., `middleware.ts:48-66`).
Note this is a **client-trust boundary, not a security boundary**: the cookie
is just whatever JSON the browser last wrote to `document.cookie` in
`useAuth.ts:141` — it is not verified against the JWT or the backend in
`middleware.ts`. Real authorization happens on the NestJS side per-request
(`JwtAuthGuard`/`RolesGuard`); the frontend gate only prevents flashing
protected UI to a logged-out browser.

## Component organization

- `components/ui/*` — a small design-system: `Button`, `Card`, `Modal`,
  `ConfirmDialog`, `DataTable`, `Table`, `Toast` (context-based toast queue),
  `Form`, `Input`, `Select`, `Checkbox`, `Switch`, `Skeleton`, `Badge`,
  `PageState` (loading/empty/error states), `LanguageSwitcher`.
- `components/layout/*` — `Sidebar` (role-keyed nav config,
  `Sidebar.tsx:45-83`), `Topbar`, `Footer`, `LayoutShell`, `ThemeInitializer`,
  `ConsoleSilencer`.
- `components/maps/*` — `MapboxMap` (base Mapbox GL wrapper),
  `LiveTrackingMap` (plots `BusLocationData` from the tracking socket).
- `components/trips/*` — `TripForm`, `TripList`, `TripDetails`, shared across
  admin/movement-manager/driver trip pages.
- `components/booking/BookingModal.tsx` — student trip-booking flow UI.
- `components/notifications/*` — card/filter/stats components +
  `BroadcastNotificationModal` (admin broadcast composer).
- `components/charts/*` — thin `react-chartjs-2` wrappers.

## State management

No global store library. State is:
- **`AuthContext`** (`hooks/useAuth.ts:18-168`) — the only app-wide context
  holding real domain state (`user`). Session lives in `localStorage`
  (`user`, `token`, `authToken`) and a `user` cookie for the edge middleware
  (`useAuth.ts:33-64,130-141`).
- **`LanguageContext`** (`contexts/LanguageContext.tsx`) — current language,
  dictionary, `t()`, `isRTL`.
- **`ToastProvider`** (`components/ui/Toast.tsx`, referenced in
  `layout.tsx:38`) — global toast queue via context.
- Everything else (trip lists, form state, filters) is local `useState`/
  `useEffect` per page/component — no server-state cache (no React
  Query/SWR), so most list pages re-fetch on mount with manual loading state.

## API layer — how the frontend calls the backend

`frontend/src/lib/api.ts` is the single HTTP client. Key mechanics:

- **Base URL**: `getApiConfig()` (`lib/config.ts:4-17`) resolves
  `API_CONFIG.GLOBAL_BASE_URL` from `lib/env.ts:4`
  (`process.env.NEXT_PUBLIC_API_BASE_URL`, default
  `http://localhost:7126/api`). `buildUrl()` **throws** if an endpoint starts
  with `/api`, `./`, or `http(s)://localhost` (`config.ts:9-12`) — this is
  what proves the frontend intentionally talks to the NestJS backend
  directly and not to its own `app/api/*` routes for domain data.
- **Auth header injection**: `apiRequest()` reads the JWT from
  `localStorage.getItem('user')` (parsed, `.token`/`.accessToken`) on the
  client, or best-effort parses a `user=` cookie when running server-side,
  and sets `Authorization: Bearer <token>` (`api.ts:122-158`).
- **Timeout**: 20s via `AbortController` (`api.ts:60,175-176`).
- **GET-with-body compatibility shim**: some backend endpoints
  (`BusesController.getAll`, `TripBookingController.search`) are called with
  a JSON body on a GET/POST; `apiRequest` converts a GET+body into query
  params or promotes it to POST as needed (`api.ts:93-119,160-172`).
- **Error normalization**: non-2xx responses are parsed for the backend's
  `{ message, errorCode, errors }` shape (matching
  `common/interfaces/api-response.interface.ts` on the backend) and thrown as
  a typed `ApiError` (`lib/apiError.ts:6-29`, `api.ts:210-243`).
- **Session-expiry handling**: a 401 on a request that *did* carry an auth
  header triggers `handleSessionExpired()` — clears local storage/cookie and
  hard-redirects to `/auth/login?sessionExpired=1` (`api.ts:66-81,233-235`).
- **No refresh-token flow**: there is no refresh endpoint on the backend and
  no silent-refresh logic on the frontend. Tokens are issued with a 7-day
  expiry (`JWT_EXPIRATION` default `7d`, `authentication.module.ts:19`) and
  simply expire; the user must log in again.

`lib/api.ts` exports one object per domain: `authAPI`, `userAPI`, `busAPI`,
`tripAPI`, `paymentAPI`, `notificationAPI`, `formsAPI`,
`subscriptionPlansAPI`, `tripBookingAPI`, `bookingAPI` (legacy), `attendanceAPI`,
`settingsAPI` (note: **hardcoded local stub**, does not call the backend —
`api.ts:1257-1274`), `adminSystemAPI` (the purge endpoint), `studentAPI`,
`studentDashboardAPI`, `routeAPI`, `studentSubscriptionAPI`, `votingAPI`. See
doc 05 for the full endpoint-by-endpoint mapping.

Two smaller, parallel service modules also exist and are both actively used
by different pages (not dead code — confirmed via import grep):
`frontend/src/lib/tripService.ts` and `frontend/src/services/tripService.ts`.
Their exact behavioral difference was not fully diffed line-by-line here;
flagged in doc 16 as needing verification for duplication/drift risk.

## `frontend/src/app/api/*` — the unused parallel backend

Roughly 45 Next.js Route Handlers exist under `app/api/` (`admin-analytics`,
`admin-announcements`, `admin-bookings`, `student-stats`, `drivers`,
`supervisor/*`, etc.). Representative example read in full:
`app/api/admin-analytics/route.ts` — it opens
`path.join(process.cwd(), 'db.json')` (`route.ts:136`) and computes analytics
from that file. **No `db.json` exists anywhere in this repository** (verified
via `find`), and a repo-wide grep for `fetch('/api/<name>'` or
`fetch("/api/<name>"` against every one of these route names found no
callers except two exceptions:
- `hooks/useTripMapping.ts:74` calls `fetch('/api/Trip', ...)` — confirmed no
  `app/api/Trip/route.ts` exists (only `admin-trips`, `driver-trips`,
  `movement-manager-trips`, `supervisor-trips`). This call would 404 at
  runtime. However, `useTripMapping` itself has **zero importers** anywhere
  in the codebase (verified by grep) — the hook is entirely dead code, so
  the broken fetch never actually executes in the shipped app.
- `app/api/image-proxy/route.ts` is genuinely live: referenced from
  `lib/backend-url.ts:34-38` (`toProxiedBackendAssetUrl`), used by
  `Topbar.tsx` and `app/dashboard/admin/users/page.tsx`, and explicitly
  proxied by nginx ahead of the backend API rule
  (`deploy/nginx/el-renad.conf.template:43-54`).

Conclusion: the `app/api/*` tree (minus `image-proxy`) is dead code from an
earlier prototype built against a mock `json-server`/`db.json` backend,
superseded by direct calls to the NestJS API. See doc 14 for the risk/cleanup
recommendation.
