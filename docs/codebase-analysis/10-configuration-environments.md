# 10 — Configuration & Environments

Only `.env.example` files were read for this document. Real `.env` files were
never opened. Variable **names and purposes** are documented below — no actual
secret values.

## `backend/.env.example`

| Variable | Purpose |
|---|---|
| `NODE_ENV` | Set to `production` in the template; controls stack-trace exposure in `AllExceptionsFilter` (only attached when not `production`) and general Nest behavior. |
| `PORT` | Backend listen port (default `7126` if unset, per `main.ts`). |
| `HOST` | Bind address — documented as loopback-only (`127.0.0.1`) since Nginx reverse-proxies to this port; must never be reachable directly from outside the server. |
| `MONGODB_URI` | Full MongoDB connection string, e.g. a local instance with a dedicated app-scoped user (not the Mongo superadmin). |
| `DB_NAME` | Database name (`bus-system` by convention). |
| `JWT_SECRET` | Signing secret for JWTs — the template placeholder explicitly says "CHANGE THIS TO A LONG RANDOM SECRET". Rotating this invalidates every issued token. |
| `JWT_EXPIRATION` | Token lifetime (default `7d`, per `authentication.module.ts`). |
| `CORS_ORIGIN` | Comma-separated allowed origins; documented as mainly relevant for direct API testing since production is same-origin behind Nginx. |
| `UPLOAD_DIR` | Path for uploaded files, pointed at a symlink into persistent storage in production so redeploys never lose uploads. |
| `MAIL_USER` | Gmail SMTP account used by nodemailer (verification/reset emails). Optional — only required if those email flows are used. |
| `MAIL_PASS` | Gmail SMTP app-password/credential paired with `MAIL_USER`. Optional, same caveat. |

## `frontend/.env.example`

| Variable | Purpose |
|---|---|
| `NODE_ENV` | Set to `production` in the template. |
| `NEXT_PUBLIC_APP_URL` | Public app URL, used to build links (e.g. reset-password email links). |
| `NEXT_PUBLIC_API_BASE_URL` | Backend API base URL the frontend's `lib/config.ts`/`lib/env.ts` resolve against (default fallback in code is `http://localhost:7126/api` if unset). |
| `NEXT_PUBLIC_BACKEND_ORIGIN` | Backend origin (no `/api` suffix) — used for asset URLs (`/uploads/...`) and the Socket.IO tracking connection base. |
| `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` | Optional Mapbox public token for map rendering; left blank in the template. |
| `NEXT_PUBLIC_CURRENCY` | Display currency code (`EGP` in the template) for payment/subscription UI. |

All `NEXT_PUBLIC_*` variables are baked into the Next.js build at build time —
`deploy/lib/env.sh` explicitly warns that changing them requires a rebuild, not
just a service restart.

## Deploy-side configuration handling (`deploy/lib/*.sh`)

- **`deploy/lib/config.sh`** — shared constants, no side effects: project/backend/
  frontend directory paths (resolved relative to the script location), domains
  (`el-renad.com` / `www.el-renad.com`), app user/group (`elrenad`), fixed
  internal ports (`BACKEND_PORT=7126`, `FRONTEND_PORT=3000`), `NODE_MAJOR=22`,
  `MONGO_MAJOR=8.0` (with a Ubuntu noble/jammy repo fallback), persistent
  storage paths (`/var/lib/elrenad`, `/etc/elrenad`, `/var/backups/elrenad`),
  systemd unit names, and the default bootstrap admin email
  (`admin@elrenad.com`).
- **`deploy/lib/secrets.sh`** — one-time secret generation into
  `/etc/elrenad/secrets.env` (mode 600): `JWT_SECRET` (32-byte hex via `openssl
  rand`), `MONGO_APP_PASSWORD` (24-byte hex), and `ADMIN_BOOTSTRAP_PASSWORD`
  (default `elrenad99`, overridable). Values are only generated if not already
  present — **never rotated on subsequent runs**; the script explicitly warns
  that deleting `JWT_SECRET` invalidates every issued login token.
- **`deploy/lib/env.sh`** — writes `backend/.env` and `frontend/.env` **once**,
  on first deploy only — both `_ensure_backend_env` and `_ensure_frontend_env`
  short-circuit if the file already exists, so re-running the deploy script
  never overwrites existing secrets/customizations. Backend `.env` is written
  mode 640, owned `root:elrenad`; frontend `.env` mode 644.
- Real secret **values** (JWT secret, Mongo app password, admin bootstrap
  password) live only in `/etc/elrenad/secrets.env` (root-only, mode 600) and
  the generated `backend/.env`/`frontend/.env` files on the server — never
  committed to git (`.gitignore` explicitly ignores `.env`/`.env.*` while
  allowlisting `!.env.example`).

## Environment-driven behavior summary

| Concern | Driven by | Where consumed |
|---|---|---|
| CORS allowlist | `CORS_ORIGIN` | `backend/src/main.ts:15-29` |
| JWT signing/verification | `JWT_SECRET`, `JWT_EXPIRATION` | `authentication.module.ts`, `jwt.strategy.ts` |
| Static upload path | `UPLOAD_DIR` | `backend/src/main.ts:46-56` |
| Email delivery | `MAIL_USER`, `MAIL_PASS` | `authentication/email.service.ts` |
| Frontend→backend base URL | `NEXT_PUBLIC_API_BASE_URL` | `frontend/src/lib/env.ts` / `config.ts` |
| Asset/socket base origin | `NEXT_PUBLIC_BACKEND_ORIGIN` | `frontend/src/lib/backend-url.ts` |
| Map rendering | `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` | `frontend/src/components/maps/MapboxMap.tsx` |
| Stack traces in error responses | `NODE_ENV` | `backend/src/common/filters/all-exceptions.filter.ts` |

## Notes

- Neither `.env.example` file documents a rate-limiting, CAPTCHA, or bot-
  protection configuration variable — consistent with the confirmed absence of
  such protections noted in `09-integrations.md` and `14-risks-observations.md`.
- `HOST=127.0.0.1` for the backend and the frontend's systemd unit binding to
  `127.0.0.1` (see `11-deployment-infrastructure.md`) together mean neither app
  process is ever directly internet-reachable in production — Nginx is the only
  public listener. This is a sound default but relies on that binding being
  correctly maintained.
