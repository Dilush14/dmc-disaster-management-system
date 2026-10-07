# DMC - Smart Disaster Early-Warning and Emergency Coordination System

University project for Sri Lanka using React/Vite, Spring Boot and Firebase. The public reporting portal at `/public` includes authenticated signup/login, hazard reporting, optional private photos and My Reports. Existing welcome/staff pages at `/` and `/auth` share its blue theme; staff authentication remains validation-only.

The public frontend is wired to authenticated Spring APIs backed by Firebase Auth, Firestore and Storage. A Firebase project has not been configured yet. Follow [Firebase setup](FIREBASE_SETUP.md) to enable live accounts and persistence. UI preview labels and local fake sessions/reports have been removed.

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

## Checks and documentation

- Frontend: `npm.cmd test`, `npm.cmd run build`, `npm.cmd run test:e2e` (installed Edge).
- Backend: `.\mvnw.cmd test` (or `./mvnw test` on Unix).
- [Public portal and API contract](frontend/PUBLIC_PORTAL.md)
- [Firebase configuration and security rules](FIREBASE_SETUP.md)
- [Verification and remaining limitations](VERIFICATION.md)

Realistic AI-generated background assets depict fictional Sri Lankan flood-response scenes. They are not documentary records. See `frontend/public/images/GENERATION.md`. The brand is DMC-inspired, not an official logo. Staff dashboard modules, live maps, notifications and emergency dispatch are not implemented.
