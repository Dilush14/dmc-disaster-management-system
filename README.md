# DMC - Smart Disaster Early-Warning and Emergency Coordination System

University project for Sri Lanka using React/Vite, Spring Boot and Firebase. The public reporting portal at `/public` serves Citizens and Community Volunteers. The desktop `/auth` forms serve DMC Officers, District Officers and Response Team Members, using Firebase authentication and the staff backend API before opening `/staff/monitoring`. For this university demo, staff registration immediately activates the selected role.

The frontend is wired to authenticated Spring APIs backed by Firebase Auth, Firestore and Storage. Live requests require Firebase to be enabled and server credentials configured. See [authentication connection](AUTH_CONNECTION.md) for the request flow and configuration requirements. UI preview labels and local fake sessions/reports have been removed.

## Run locally

Requires Node/npm and Java 17+. From separate terminals:

```powershell
cd frontend
npm.cmd install
npm.cmd run dev
```

```powershell
cd backend
.\mvnw.cmd spring-boot:run
```

Open http://localhost:5173/public. Backend health: http://localhost:8080/api/health. Applications can start with Firebase disabled, but protected operations require configured services. Both apps load their local environment files; restart after changes. Never commit credentials.

## Mobile application

The `mobile/` directory contains the Expo React Native application for Citizens and Community Volunteers. The existing `frontend/` remains the staff web portal for DMC and district officers.

```powershell
cd mobile
Copy-Item .env.example .env
# Fill the public Firebase client values in .env
npm.cmd start
```

Use `http://10.0.2.2:8080` for the Android emulator or replace `EXPO_PUBLIC_API_URL` with the development machine's LAN address when using a physical device. The mobile app uses Firebase Auth and the existing public Spring Boot endpoints; backend secrets must never be copied into `mobile/.env`.

Hazard reports are offline-capable. When submission cannot reach the backend, the report and selected photo are stored in the app's local queue. The app retries queued reports when it starts and whenever network connectivity returns. A stable client request ID is reused for retries, so a temporary connection failure cannot create duplicate reports. Keep the app signed in while waiting for queued reports to synchronize.

## Checks and documentation

- Frontend: `npm.cmd test`, `npm.cmd run build`, `npm.cmd run test:e2e` (installed Edge).
- Backend: `.\mvnw.cmd test` (or `./mvnw test` on Unix).
- [Public portal and API contract](frontend/PUBLIC_PORTAL.md)
- [Firebase configuration and security rules](FIREBASE_SETUP.md)
- [Verification and remaining limitations](VERIFICATION.md)

Realistic AI-generated background assets depict fictional Sri Lankan flood-response scenes. They are not documentary records. See `frontend/public/images/GENERATION.md`. The brand is DMC-inspired, not an official logo. Staff dashboard modules, live maps, notifications and emergency dispatch are not implemented.
