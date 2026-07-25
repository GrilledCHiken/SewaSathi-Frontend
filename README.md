# Sewa Sathi

Sewa Sathi is a local services marketplace for Nepal, connecting customers who need home
services (cleaning, repairs, moving, plumbing, and more) with verified local workers.

## Project structure

This is a monorepo with two independently deployable projects:

```
backend/            Spring Boot 4 + MySQL REST API (Java 21)
frontend/SewaSathi/  React 19 + Vite + Tailwind CSS single-page app
```

## Features

- **Auth** — JWT-based registration/login for customers and workers, admin-only accounts,
  login rate-limiting with account lockout, forgot/reset password, and email verification
  (emails are logged to the console in dev — no SMTP provider is wired up yet).
- **Worker approval workflow** — workers sign up and wait for admin approval before they can
  accept tasks; admins can approve, reject, or suspend accounts from the admin panel.
- **Tasks** — customers post tasks, browse and directly hire workers, and track task status
  through the full lifecycle (open → assigned → in progress → completed/cancelled).
- **Worker dashboard** — approved workers browse open tasks, manage their jobs, and edit their
  own skills/rate/location/bio profile.
- **Reviews & ratings** — customers review completed tasks; ratings roll up into each worker's
  public profile.
- **Real-time messaging** — WebSocket (STOMP over SockJS) chat between a customer and their
  assigned worker per task, including photo/file attachments.
- **Admin panel** — overview stats, worker verification queue, and user management
  (suspend/unsuspend).

## Getting started

### Backend

Requires JDK 21 and a running MySQL instance.

```bash
cd backend
cp src/main/resources/application.properties.example src/main/resources/application.properties
# edit application.properties with your DB credentials and a generated JWT secret
./mvnw spring-boot:run
```

The API runs on `http://localhost:8080`. Run tests with `./mvnw test`.

### Frontend

Requires Node.js.

```bash
cd frontend/SewaSathi
cp .env.example .env
# edit .env if the backend isn't running on the default URL
npm install
npm run dev
```

The app runs on `http://localhost:5173` (or the next available port).

## Tech stack

- **Backend**: Spring Boot 4, Spring Security (JWT), Spring Data JPA, Spring WebSocket (STOMP),
  MySQL, JJWT
- **Frontend**: React 19, Vite, React Router 7, Tailwind CSS 4, Axios, @stomp/stompjs
