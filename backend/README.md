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

`app.khalti.*` points at Khalti's ePayment (KPG-2) dev sandbox. **Unlike eSewa there is no
shared demo merchant** — Khalti issues every merchant its own key, so you have to fetch one
before Khalti will answer anything but `401`:

1. Sign up at <https://test-admin.khalti.com/#/join/merchant> (login OTP is `987654`).
2. Copy your `live_secret_key` — yes, it is called "live" even in the sandbox.
3. Put it in `application.properties`:

```properties
app.khalti.secret-key=live_secret_key_...
```

Left blank, choosing Khalti at checkout fails with a "not configured" message rather than a
confusing gateway error.

Then pay with Khalti's sandbox wallet:

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

For production, use your key from <https://admin.khalti.com> and the live endpoints:

```properties
app.khalti.initiate-url=https://khalti.com/api/v2/epayment/initiate/
app.khalti.lookup-url=https://khalti.com/api/v2/epayment/lookup/
```

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

## Notes

- Outgoing email (password reset, email verification) is logged to the console in dev — no SMTP
  provider is configured. Swap `ConsoleEmailService` for a real `EmailService` implementation to
  send actual emails.
- Uploaded chat attachments are stored on local disk under `uploads/` (configurable via
  `app.upload-dir`) and served statically from `/uploads/**`.
