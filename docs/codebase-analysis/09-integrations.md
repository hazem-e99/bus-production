# 09 — External Integrations

## Confirmed integrations

### Email — Gmail SMTP via nodemailer
`backend/src/modules/authentication/email.service.ts`:
- `nodemailer.createTransport({service: 'gmail', auth: {user:
  configService.get('MAIL_USER'), pass: configService.get('MAIL_PASS')}})`
  (lines ~11-18).
- Two methods only: `sendVerificationCode(email, code, firstName)` and
  `sendPasswordResetCode(email, token, firstName)`, both with inline HTML email
  templates, `from: "Bus System" <${MAIL_USER}>`.
- Consumers: `AuthenticationService.registerStudent`/`registerStaff`
  (verification code), `forgotPassword` (reset code). No other module sends
  email.
- Configuration: `MAIL_USER`/`MAIL_PASS` env vars (`backend/.env.example`,
  documented as "Optional mail settings (required if forgot-password emails are
  enabled)"). If unset, `nodemailer` will fail to authenticate and any
  registration or forgot-password call will surface a 502
  `EMAIL_DELIVERY_FAILED` (registration additionally rolls back the created
  user in that case).
- **No SMS/OTP provider integration** — verification and reset flows are
  email-only. Confirmed by repo-wide search: no `twilio`, no SMS-related
  package in `backend/package.json`.

### Maps — Mapbox GL (frontend-only, no backend integration)
- `mapbox-gl` / `react-map-gl` dependencies (`frontend/package.json`).
- `frontend/src/components/maps/MapboxMap.tsx` — base map wrapper; a
  `LiveTrackingMap` component (per the frontend research) plots
  `BusLocationData` received over the Socket.IO tracking channel.
- Token: `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` (`frontend/.env.example`, listed as
  "Optional" and left blank in the template) — this is a client-exposed public
  token by design (Mapbox's public tokens are meant to be used client-side and
  restricted by URL/referrer on the Mapbox account side, not a secret leak by
  itself, but its absence/misconfiguration would break map rendering).
- This is a **pure rendering integration** — Mapbox is never called from the
  NestJS backend; the backend only stores/broadcasts raw lat/lng numbers.

## Confirmed absence of other integrations

- **Payment gateway**: none. `Payment.paymentMethod` is a plain enum
  (`Offline|Online`) with no gateway SDK, webhook handler, or outbound HTTP call
  to any payment processor anywhere in `backend/src` (confirmed by dependency
  list — no Stripe/PayPal/Paymob/Fawry SDKs — and by reading
  `payment.controller.ts`/`payment.service.ts` in full: it's a manual
  create-then-admin-reviews record-keeping flow). "Online" appears to be a
  label for a payment made through some other unintegrated channel, not a
  processed transaction.
- **SMS/OTP**: none. No SMS provider package or code path found.
- **OAuth / third-party login**: none. `@nestjs/passport` is used solely for
  the local `passport-jwt` strategy — no `passport-google-oauth`,
  `passport-facebook`, or similar strategy is registered anywhere.
- **Cloud storage (S3/GCS/Azure Blob)**: none. File uploads go to local disk
  (`backend/uploads/`, or the production symlink to
  `/var/lib/elrenad/uploads`) via Multer's default disk storage — no cloud SDK
  dependency exists in `backend/package.json`.
- **Push notifications (FCM/APNs/web-push)**: none found. The "Notifications"
  module is entirely in-app/database-stored (`notifications` collection),
  surfaced via REST polling (`GET /api/Notifications/unread-count`, etc.) — not
  actual push delivery to a device.
- **Analytics/monitoring/error-tracking (Sentry, Datadog, etc.)**: none found
  in either `backend/package.json` or `frontend/package.json`.
- **CAPTCHA/bot-protection**: none found on the public registration/login/
  forgot-password endpoints — relevant given the confirmed Critical
  registration-staff finding in `14-risks-observations.md`.

## Internal "integration" — Socket.IO between frontend and backend

Not an external integration, but the one live real-time channel: NestJS's
`BusTrackingGateway` (`socket.io`, namespace `/tracking`) is consumed by the
frontend via `socket.io-client` (`frontend/src/hooks/useBusTracking.ts`). In
production this is proxied by Nginx at `/socket.io/` with WebSocket upgrade
headers and an extended `proxy_read_timeout 3600s` (see
`11-deployment-infrastructure.md`).
