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
  login rate-limiting with account lockout, and admin-managed worker approval. Sign-up is
  email + password only: the account is active immediately, with no confirmation step, no
  second factor, and no social providers.
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
- **Admin panel** — two surfaces over the same services: the React admin pages in the SPA, and a
  server-rendered Thymeleaf console at `/admin` with session-based login, CSRF-protected AJAX,
  and an idle-session warning.
- **Reports** — revenue, task volume and worker performance as PDF or Excel, generated with
  JasperReports from either admin surface.
- **Sessions** — short-lived access tokens with rotating refresh tokens, reuse detection, idle
  timeout, and "sign out everywhere"; the admin console uses server-side sessions that expire.

## Requirement coverage

Where each coursework requirement is implemented. Paths are relative to the repository root.

| # | Requirement | Where it lives |
|---|---|---|
| 1 | **Authentication & authorisation** — role-based login, password hashing, Spring Security | `backend/.../config/SecurityConfig.java` (two chains, `@EnableMethodSecurity`, BCrypt), `security/JwtAuthFilter.java`, `security/CustomUserDetailsService.java`, `entity/Role.java` (ADMIN / CUSTOMER / WORKER) |
| 2 | **Session management with timeouts** | Console: `HttpSession` with `server.servlet.session.timeout`, session fixation protection, one session per admin, `invalidSessionUrl` — all in `SecurityConfig.adminFilterChain`. API: `entity/RefreshToken.java` + `service/RefreshTokenService.java` — short access tokens, rotation, reuse detection, idle timeout, revocation |
| 3 | **Hibernate ORM** | `backend/.../entity/` — `@Entity`, `@ManyToOne`, `@OneToOne`, `@Enumerated`, indexes; `repository/` Spring Data JPA interfaces with JPQL aggregates |
| 4 | **Thymeleaf front end + Spring MVC** | `backend/src/main/resources/templates/admin/` (layout, login, dashboard, users, workers, reports), `static/admin/assets/app.css` + `app.js` (responsive CSS, AJAX), `controller/web/AdminWebController.java`, `controller/web/AdminWebApiController.java` |
| 5 | **Controllers, services, DI** | `controller/`, `service/`; constructor injection throughout via Lombok `@RequiredArgsConstructor`; DTO JavaBeans in `dto/` |
| 6 | **RESTful API** | `controller/*Controller.java` — `@RestController` CRUD over tasks, workers, reviews, messages, payments, admin |
| 7 | **Security: XSS, CSRF, injection** | CSRF enabled on the session chain (`SecurityConfig.adminFilterChain`); security headers incl. per-chain CSP; Thymeleaf auto-escaping; bean validation on every `dto/request/*`; JPQL parameter binding everywhere (no string-concatenated queries) |
| 8 | **Error handling & logs** | `templates/error/{400,403,404,500}.html` + `templates/error.html`, `exception/GlobalExceptionHandler.java` (JSON) and `exception/WebExceptionHandler.java` (HTML), `config/ErrorAttributesConfig.java` (correlation id on the page) |
| 9 | **Testing** | `backend/src/test/java/com/sewasathi/` — JUnit 5 unit tests plus `@SpringBootTest` integration tests against in-memory H2 |
| 10 | **Logging & monitoring** | SLF4J over Logback (`resources/logback-spring.xml`), `config/CorrelationIdFilter.java`, Spring Boot Actuator (health/info public, everything else admin-only) |
| 11 | **Internationalisation** | `config/I18nConfig.java` (MessageSource, `SessionLocaleResolver`, validator wiring), `config/WebConfig.java` (`LocaleChangeInterceptor`), `resources/messages.properties`; console language switcher in `templates/admin/layout.html` |
| 12 | **File upload / download** | `controller/FileController.java`, `service/FileStorageService.java`, `service/FileAccessService.java` (per-file authorisation), `frontend/.../api/fileApi.js` |
| 13 | ~~**Email**~~ | **Not implemented.** Outbound email was removed along with signup verification; the application sends no mail. User-facing notices go through the in-app feed (`service/NotificationService.java`, WebSocket) instead. |
| 14 | **Reporting** | JasperReports: `resources/reports/*.jrxml`, `service/ReportService.java` (PDF + Excel), `/admin/reports` on the console and `/api/admin/reports/{slug}` for the SPA (`frontend/.../pages/Admin/AdminAnalytics.jsx`) |
| 15 | **Version control** | Git; this repository |
| + | **Push notifications** | `service/NotificationService.java` (WebSocket), `frontend/.../hooks/useDesktopNotifications.js`, `frontend/.../components/NotificationBell.jsx` |
| + | **Newsletter pop-up** | `frontend/.../components/NewsletterPopup.jsx`, `controller/NewsletterController.java`, `service/NewsletterService.java` (records the subscription; sends no welcome mail) |
| + | **Payment gateway** | `service/EsewaService.java`, `service/KhaltiService.java`, `service/PaymentService.java`, `controller/PaymentController.java` |
| + | **Chat** | `websocket/` (STOMP over SockJS), `service/MessageService.java`, `frontend/.../components/Chat/ChatPage.jsx` |

### Admin console

The server-rendered console lives at `http://localhost:8080/admin`, separate from the React SPA
and authenticated with a session cookie rather than a bearer token. On first startup a
bootstrap administrator is created from `app.admin.bootstrap.*` (see
`application.properties.example`); the production profile disables that entirely.

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

- **Backend**: Spring Boot 4, Spring Security (JWT for the API, sessions for the admin console),
  Spring Data JPA / Hibernate, Spring WebSocket (STOMP), Thymeleaf, JasperReports, MySQL, JJWT
- **Frontend**: React 19, Vite, React Router 7, Tailwind CSS 4, Axios, @stomp/stompjs
