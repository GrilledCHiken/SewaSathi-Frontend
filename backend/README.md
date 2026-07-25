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

## Notes

- Outgoing email (password reset, email verification) is logged to the console in dev — no SMTP
  provider is configured. Swap `ConsoleEmailService` for a real `EmailService` implementation to
  send actual emails.
- Uploaded chat attachments are stored on local disk under `uploads/` (configurable via
  `app.upload-dir`) and served statically from `/uploads/**`.
