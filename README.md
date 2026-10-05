# DMC – Smart Disaster Early-Warning and Emergency Coordination System

University project for Sri Lanka. This iteration contains a public welcome page, login/signup UI, and a backend foundation. Disaster modules, maps, dashboards and notifications are out of scope.

See [verification status](VERIFICATION.md) for passed checks and environment-blocked checks.

## Stack and startup
React, JavaScript, Vite, Tailwind CSS, React Router, Lucide; Spring Boot, Java 17+, Maven; Firebase Auth, Firestore and Storage configuration boundaries.

Frontend:
```powershell
cd frontend
npm install
npm run dev
```
Open http://localhost:5173. Routes: `/`, `/auth`, `/auth?mode=signup`.

Backend:
```powershell
cd backend
.\mvnw.cmd spring-boot:run
```
Linux/macOS: `./mvnw spring-boot:run`. Java 17+ required. Maven downloads automatically. Health: http://localhost:8080/api/health.

Checks: frontend `npm run build`, `npm test`, `npm run test:e2e`; backend `.\mvnw.cmd test` or `./mvnw test`. Browser tests use installed Edge. To use Chromium instead, remove `channel: 'msedge'` in the Playwright config and run `npx playwright install chromium`.

## Firebase configuration
Both applications run without credentials. Forms perform local validation only and explain that integration is pending. No passwords are saved or logged, accounts created, sessions persisted, or privileges granted. Remember me, recovery and social login are UI previews.

Copy `frontend/.env.example` to `.env.local` and provide the Firebase console web-app values:
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`

Restart Vite after changes. `VITE_API_BASE_URL` defaults to http://localhost:8080. Initialization is lazy and missing Firebase configuration returns null services. Never put admin credentials in client variables.

Backend Firebase defaults to disabled. Set process environment variables `FIREBASE_ENABLED=true`, `FIREBASE_PROJECT_ID`, `FIREBASE_STORAGE_BUCKET`, and `GOOGLE_APPLICATION_CREDENTIALS` pointing to a private service-account JSON **outside the repository**. Spring Boot does not automatically load `.env`; its example documents the variables. Enabling Firebase without valid credentials fails startup explicitly.

`CORS_ALLOWED_ORIGINS` accepts comma-separated origins (defaults: localhost and 127.0.0.1 on port 5173). `PORT` defaults to 8080. Only GET `/api/health` is public; all other routes are denied. Before real authentication, implement ID-token verification, server-controlled role provisioning and Firestore/Storage rules.

## Design and assets
Screenshots guide the layout and palette; they are not embedded as pages. The dashboard screenshot informs styling only.

Realistic AI-generated backgrounds now replace the SVG illustrations:
- `frontend/public/images/dmc-flood-rescue.png` (1672x941)
- `frontend/public/images/dmc-resilient-community.png` (941x1672)

Created with the built-in image generation tool. These depict fictional Sri Lankan flood-response scenes, not documentary records. The tool returned these dimensions despite a Full HD request. See `frontend/public/images/GENERATION.md` for prompts. The original SVG placeholders are retained but no longer referenced by the UI. The shield brand remains DMC-inspired, not an official logo.

Desktop login: **image LEFT, form RIGHT**. Signup: **form LEFT, image RIGHT**. Register/Login and top controls switch the same card with a 650 ms transform and staged fade. Only one form is mounted. Below 761px, form and visual stack for readability. Reduced-motion preferences disable CSS motion.

## Final structure and important files
```text
frontend/
  public/images/
  src/
    components/auth/       # AuthContainer, AuthVisualPanel, forms, FormInput
    components/common/     # InfoDialog
    components/layout/     # Navbar, HeroSection, Footer
    constants/portal.js
    pages/public/WelcomePage.jsx
    pages/auth/AuthPage.jsx
    services/api/client.js
    services/firebase/     # config.js, authService.js
    styles/index.css
    utils/                 # validation and tests
    App.jsx
    main.jsx
  tests/auth.spec.js
  .env.example
  index.html
  package.json
  package-lock.json
  playwright.config.js
  vite.config.js
backend/
  .mvn/wrapper/maven-wrapper.properties
  src/main/java/lk/dmc/
    config/                # SecurityConfig, FirebaseConfig
    controller/HealthController.java
    DmcApplication.java
  src/main/resources/application.properties
  src/test/java/lk/dmc/DmcApplicationTests.java
  .env.example
  mvnw
  mvnw.cmd
  pom.xml
```
Add service, repository, model, DTO and exception packages when those layers have actual responsibilities rather than adding empty scaffolding.

References: [Tailwind Vite](https://tailwindcss.com/docs/installation/using-vite), [Firebase setup](https://firebase.google.com/docs/web/setup), [Spring Boot](https://docs.spring.io/spring-boot/3.5/reference/index.html).
