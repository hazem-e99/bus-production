# Email Deliverability — Verification & Password-Reset Codes

This documents the verification-code / password-reset email flow, what was
changed in the repository to improve inbox placement, and what remains an
external (DNS/provider) responsibility that cannot be fixed by code alone.

## Current provider

- **Library**: [nodemailer](https://nodemailer.com/), `service: 'gmail'` preset
  (`backend/src/modules/authentication/email.service.ts`).
- **Transport**: Gmail SMTP, authenticated via `MAIL_USER` (a Gmail/Workspace
  address) and `MAIL_PASS` (a Google **App Password** — not the account login
  password; requires 2-Step Verification enabled on that Google account).
- **Callers**: `AuthenticationService.registerStudent()`, `registerStaff()`
  (verification code) and `forgotPassword()` (reset code) —
  `backend/src/modules/authentication/authentication.service.ts`.
- There is no dedicated sending domain, no transactional email provider
  (SendGrid/Mailgun/SES/Resend), and no custom DNS records configured for
  mail today — everything sends through a personal/Workspace Gmail mailbox.

## Root cause analysis

### Application-level issues (fixed in this change)

- Sender was `"Bus System" <MAIL_USER>` — a generic, inconsistent display
  name unrelated to the actual product name, which looks less trustworthy to
  spam filters and recipients. **Fixed**: sender is now `"El Renad"
  <MAIL_USER>` (configurable via `MAIL_FROM_NAME`).
- No `Reply-To` header was set. **Fixed**: `Reply-To` now defaults to
  `MAIL_USER`, overridable via `MAIL_REPLY_TO`.
- Emails were **HTML-only**, with no plain-text alternative — a well-known
  spam signal (legitimate transactional mail almost always includes both
  parts). **Fixed**: every email now sends a `text` alternative alongside
  `html`.
- The HTML template used a large centered 32px, 8px-letter-spaced code block
  with sparse content — visually fine, but generic. **Fixed**: a simpler,
  clearly transactional template (product name, purpose sentence, code,
  expiry, ignore-if-not-you line, minimal footer) with no images, no tracking
  pixels, and no promotional language, which is the pattern spam filters treat
  most favorably for OTP-style mail.
- Logging previously only logged success/failure with the recipient address.
  **Improved**: failure logs now include the provider's error message; success
  logs include the SMTP `messageId` for support/troubleshooting. **The OTP
  code itself is never logged**, in either the old or new code.

None of these application-level changes can guarantee inbox placement by
themselves — see "External factors" below.

### Provider configuration issues (external, not fixable in this repo)

Gmail's own SMTP relay (`service: 'gmail'`) sends **from a Gmail-owned
sending domain's infrastructure on your behalf**, using your Gmail address as
the visible `From`. This works, but:

- You cannot configure custom SPF/DKIM/DMARC for a plain `@gmail.com` address
  — Google already publishes those records for `gmail.com`, and mail sent
  via Gmail's SMTP naturally aligns with them. Deliverability risk here is
  mostly about the **sending account's own reputation and volume**, not
  missing DNS.
- If `MAIL_USER` is a **Google Workspace** address on a custom domain (e.g.
  `no-reply@el-renad.com`), that domain's own SPF/DKIM/DMARC records
  determine deliverability — see below.
- Sending a high volume of near-identical OTP emails from a personal/shared
  Gmail mailbox (rather than a dedicated transactional-email
  provider/domain) is itself a risk factor Gmail and other receiving servers
  weigh — this is a structural limitation of using `service: 'gmail'` for
  transactional mail at scale, not something a code change resolves.

### DNS issues (external)

Only relevant if `MAIL_USER` is on a **custom domain** (Workspace or another
SMTP provider) rather than a plain `@gmail.com` address:

- **SPF**: the domain's DNS must publish a TXT record authorizing Google's
  mail servers to send on its behalf, e.g. `v=spf1 include:_spf.google.com
  ~all` (exact record depends on the mail provider's documentation — do not
  copy this blindly without confirming against the actual provider).
- **DKIM**: Google Workspace generates a DKIM key pair in the Admin Console:
  the corresponding TXT record must be published under
  `google._domainkey.<domain>` and DKIM signing must be turned on in the
  Workspace admin panel.
- **DMARC**: a TXT record at `_dmarc.<domain>` (e.g. starting at
  `p=none` while monitoring, then tightening to `p=quarantine`/`p=reject`
  once SPF/DKIM alignment is confirmed working).
- **Sender/domain verification**: if a dedicated transactional provider
  (SendGrid, Mailgun, SES, Resend, etc.) is adopted in the future instead of
  Gmail SMTP, that provider will require its own domain verification, SPF
  include, and DKIM CNAME records — these are provider-specific and must be
  taken from that provider's dashboard, not invented here.

### Reputation / external factors (cannot be "fixed", only monitored)

- Gmail/Outlook/Yahoo apply reputation scoring per sending account/domain and
  per recipient's own filtering history (e.g. if a recipient previously
  marked similar mail as spam).
- New sending accounts or domains generally see worse initial placement
  ("warm-up" effect) regardless of message content.
- None of this is visible or controllable from inside this repository — it
  requires monitoring actual delivery (e.g. Google Postmaster Tools for a
  Workspace domain) over time.

## What changed in this repository

| File | Change |
|---|---|
| `backend/src/modules/authentication/email.service.ts` | Rewritten: configurable sender name/reply-to, HTML **and** plain-text bodies, simplified transactional template, safer success/failure logging (message ID, no OTP). Provider (Gmail SMTP via nodemailer) and the two call sites (`sendVerificationCode`, `sendPasswordResetCode`) are unchanged. |
| `backend/.env.example` | Documented `MAIL_FROM_NAME` (optional, defaults to "El Renad") and `MAIL_REPLY_TO` (optional, defaults to `MAIL_USER`) alongside the existing `MAIL_USER`/`MAIL_PASS`. |

No OTP generation, expiration, or verification logic changed —
`authentication.service.ts`'s code generation (`Math.floor(100000 +
Math.random() * 900000)`), 24-hour verification-code expiry, and 1-hour
reset-code expiry are untouched.

## Explicit constraint

**This change does not guarantee verification emails will land in the
inbox.** It fixes the application-level factors that are within this
repository's control (sender identity, plain-text alternative, template
quality, headers). Actual inbox-vs-spam placement also depends on the Gmail
account's/domain's authentication (SPF/DKIM/DMARC) and sender reputation,
which are configured outside this codebase — see "Remaining manual actions"
below.

## Remaining manual actions (only if applicable)

1. If `MAIL_USER` will remain a plain `@gmail.com` address: no DNS action is
   possible or needed — deliverability depends on that account's own
   reputation and sending volume over time. Monitor actual spam reports.
2. If `MAIL_USER` is (or becomes) a Google Workspace address on a custom
   domain: enable DKIM signing for that domain in the Workspace Admin
   Console and confirm the generated DKIM TXT record is published in DNS.
3. If using a custom domain: publish an SPF TXT record authorizing Google's
   servers (confirm the exact record with Google Workspace's own SPF setup
   documentation for that domain).
4. If using a custom domain: publish a DMARC TXT record at
   `_dmarc.<domain>`, starting in monitoring mode (`p=none`) before
   tightening the policy.
5. Set `MAIL_FROM_NAME` (and optionally `MAIL_REPLY_TO`) in the production
   `backend/.env` if a different display name or reply address than the
   defaults is desired.
6. Consider migrating off `service: 'gmail'` to a dedicated transactional
   email provider (SendGrid/Mailgun/SES/Resend) if verification-email volume
   grows — this is a larger change (new dependency, new provider
   credentials, provider-specific domain verification) and was intentionally
   **not** made here, since it would go beyond the application-level fix
   requested and requires a business decision on which provider to use.
