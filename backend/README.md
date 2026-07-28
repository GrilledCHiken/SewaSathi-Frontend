# Sewa Sathi — Backend

Spring Boot 4 REST API for Sewa Sathi. See the [root README](../README.md) for the full project
overview.

## Setup

Requires JDK 21 and a running MySQL instance (create a `sewasathi` database).

```bash
cp src/main/resources/application.properties.example src/main/resources/application.properties
```

Edit `application.properties` with your MySQL credentials and a generated JWT secret
(`openssl rand -base64 64`). Schema is managed via Hibernate `ddl-auto=update` — no separate
migration step is required.

```bash
./mvnw spring-boot:run
```

The API runs on `http://localhost:8080`.

## Tests

```bash
./mvnw test
```

## Testing eSewa payments

`app.esewa.*` points at eSewa's RC (UAT) sandbox by default. The sandbox is a **separate system
from production** — your own eSewa account does not exist there, so real credentials will never log
in at `https://rc-epay.esewa.com.np/auth`. Use eSewa's shared test account instead:

| Field | Value |
| --- | --- |
| eSewa ID | `9711111111` (also `9711111112`, `9711111113`, `9711111114`) |
| Password | `Nepal@123` |
| Token / OTP | `123456` |
| MPIN | `1122` — **mobile app only, not the web login** |

Two things trip people up: entering a real eSewa ID, and typing the MPIN into the web login's
password box. The web form wants the password.

The matching merchant credentials are `app.esewa.merchant-code=EPAYTEST` and
`app.esewa.secret-key=8gBm/:&EnhH.1/q`. Both are published demo values with no real money behind
them, so the sandbox secret is not a secret — set it verbatim in your local
`application.properties` or signature verification will fail.

Source of truth (these values do change): <https://developer.esewa.com.np/pages/Epay>. Older test
IDs such as `9806800001` circulate in blog posts and no longer match the documented set.

For production, swap in your own merchant code and secret key and point at the live endpoints:

```properties
app.esewa.form-url=https://epay.esewa.com.np/api/epay/main/v2/form
app.esewa.status-url=https://esewa.com.np/api/epay/transaction/status/
```

## Testing Khalti payments

`app.khalti.*` points at Khalti's ePayment (KPG-2) dev sandbox. Nothing to set up — like eSewa's
`EPAYTEST`, Khalti publishes a shared sandbox key and it is already the default in
`application.properties`:

```properties
app.khalti.secret-key=${KHALTI_SECRET_KEY:live_secret_key_68791341fdd94846a146f0457ff7b455}
```

To use your own merchant instead, sign up at <https://test-admin.khalti.com/#/join/merchant> (login
OTP is `987654`), copy your `live_secret_key` — yes, it is called "live" even in the sandbox — and
export it as `KHALTI_SECRET_KEY`, which takes precedence over the default:

```powershell
# this shell only
$env:KHALTI_SECRET_KEY = "live_secret_key_..."

# or persist it, then restart your IDE so it inherits the variable
[Environment]::SetEnvironmentVariable("KHALTI_SECRET_KEY", "live_secret_key_...", "User")
```

In IntelliJ it can equally go in the Spring Boot run configuration's *Environment variables* field.

If checkout still reports "Khalti payments are not configured on this server", the backend is running
off stale classes — rebuild, and restart the JVM rather than reusing a process started before the
config changed.

Pay with Khalti's sandbox wallet:

| Field | Value |
| --- | --- |
| Khalti ID | `9800000000` through `9800000005` |
| MPIN | `1111` |
| OTP | `987654` |

Two things to know about the sandbox:

- **Khalti refuses anything under NPR 10** (its API counts in paisa, minimum 1000). The advance
  is 10% of the budget, so a task must be budgeted at NPR 100 or more to be payable by Khalti.
- **Payment links expire** — 60 minutes in production, sooner in the sandbox. An expired link
  comes back as `status=Expired` and the attempt is closed off; just start checkout again.

Source of truth: <https://docs.khalti.com/khalti-epayment/>.

For production, `application-prod.properties` already points at the live endpoints. All it needs is
`KHALTI_SECRET_KEY` set to your key from <https://admin.khalti.com> — the `prod` profile declares it
with no default, so a deploy missing it fails to start instead of breaking checkout.

### How the two gateways differ

Worth knowing before changing either flow:

- **eSewa** takes a browser form POST signed with HMAC-SHA256, and redirects to separate success
  and failure URLs. Because the callback is signed, a validly signed `COMPLETE` is honoured when
  the status API happens to be unreachable.
- **Khalti** is opened server-to-server first (`/epayment/initiate/`), returns a `payment_url` the
  browser is simply sent to, and comes back to a single return URL for every outcome. Nothing in
  that redirect is signed, so `/epayment/lookup/` is the *only* authority — an unreachable Khalti
  fails the payment rather than trusting the query string. The `pidx` is stored against the
  payment at initiation, which is what ties the return trip back to the right customer.

## Authentication

Email + password, and nothing else. `POST /api/auth/register/{customer,worker}` creates an
active account and returns it **without** a token; the SPA then sends the user to `/login` to
sign in once. `POST /api/auth/login` returns a short-lived JWT plus a rotating refresh token
(see `RefreshTokenService`). Five consecutive wrong passwords lock the account for 15 minutes.

Workers sign in immediately but stay `PENDING` until an admin approves them, which is what
gates accepting tasks.

There is deliberately **no** email verification, no two-factor challenge, no new-device OTP,
and no social sign-in. Nothing has to be configured to run the app locally beyond the database
and JWT secret.

### No outbound email

The application sends no mail at all — there is no `EmailService`, no `spring.mail.*`
configuration, and no `spring-boot-starter-mail` dependency. User-facing notices go to the
in-app feed instead (`NotificationService`, delivered over WebSocket and surfaced by
`NotificationBell.jsx`).

**Consequence: there is no self-service password reset.** A user who forgets their password
cannot recover it — a reset link has no delivery channel — and there is no admin reset path
either, so recovering an account means updating `users.password_hash` directly with a BCrypt
hash of the new password.

### Removing the old schema

2FA, verification, OAuth and password-reset left four tables and four `users` columns behind
that `ddl-auto=update` will never drop.
[`src/main/resources/db/remove-auth-extras.sql`](src/main/resources/db/remove-auth-extras.sql)
clears them. This is housekeeping rather than a prerequisite — registration was verified
working against an un-migrated database — but leaving unused `NOT NULL` columns in place is a
trap for anyone later writing an `INSERT` by hand.

## Notes

- Uploaded chat attachments are stored on local disk under `uploads/` (configurable via
  `app.upload-dir`) and served statically from `/uploads/**`.
