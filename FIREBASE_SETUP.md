# Connect Firebase

The public portal `/public` now uses Firebase Authentication and the Spring backend for profiles, reports and private photos. There is no local fake-login or report-storage fallback. No Firebase project has been configured yet.

## 1. Create the services

1. Create a project in the Firebase console and register a Web app. Copy its configuration values.
2. Enable Authentication > Sign-in method > Email/Password. Add your development host (`localhost` and, if used, `127.0.0.1`) under authorized domains.
3. Create a Cloud Firestore **default database** in production mode.
4. Create a Cloud Storage bucket and copy its exact bucket name (without `gs://`). Cloud Storage currently requires the Blaze billing plan; review billing before enabling it. See [Firebase Storage setup](https://firebase.google.com/docs/storage/web/start).
5. In Project settings > Service accounts, generate an Admin SDK private key. Save it outside this repository, for example `C:/Users/Dilush/private/dmc-service-account.json`. Never place it under frontend/public or in a VITE variable.

See [email/password setup](https://firebase.google.com/docs/auth/web/password-auth) and [Admin SDK setup](https://firebase.google.com/docs/admin/setup).

## 2. Set local configuration

Fill the existing `frontend/.env` using `frontend/.env.example` as the template. All six VITE_FIREBASE values must come from the same Web app. Keep `VITE_API_BASE_URL=http://localhost:8080`. If `.env.local` exists, check it too: its values override `.env`.

Fill `backend/.env`:

```dotenv
FIREBASE_ENABLED=true
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_STORAGE_BUCKET=your-exact-bucket-name
GOOGLE_APPLICATION_CREDENTIALS=C:/Users/Dilush/private/dmc-service-account.json
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
PORT=8080
```

Use forward slashes in the credentials path: Spring reads this file as Java properties. Start the backend from its own directory so the optional `.env` import resolves. Process environment variables can override file settings. The service account needs access to Firebase Authentication (including revocation checks), Firestore and the specified Storage bucket.

Environment files, Admin key filename patterns, logs and build/test outputs are gitignored. Keep the Admin JSON outside the repository regardless of its filename.

## 3. Protect direct client access

The browser accesses Firestore and Storage through the backend only. Publish the contents of `firebase/firestore.rules` and `firebase/storage.rules` in the respective Firebase console Rules tabs for this new project. They deny direct client access. Admin SDK access uses IAM and bypasses these rules; Spring verifies tokens, roles and report ownership.

These rules are intentionally for this project. If adding unrelated client-access features later, review their requirements before changing rules. No rules have been deployed automatically.

## 4. Start both applications

Backend terminal:

```powershell
cd dmc-disaster-management/backend
.\mvnw.cmd spring-boot:run
```

Frontend terminal:

```powershell
cd dmc-disaster-management/frontend
npm.cmd install
npm.cmd run dev
```

Restart both processes after changing configuration. Open http://localhost:5173/public and register a Citizen or Community Volunteer. Sign in, submit a report and optional JPEG/PNG photo, then reload My Reports. Confirm `publicUsers` and `hazardReports` documents in Firestore and the photo in Storage. Test with a second account: it must not see the first account's reports or photos.

`GET http://localhost:8080/api/health` checks server availability only, not cloud credentials. With Firebase disabled, protected requests fail rather than pretending to save. A 401 means missing/invalid authentication; 403 means the role is not allowed; 503 indicates unavailable backend/cloud configuration or service failure. Check the browser network request and backend configuration when diagnosing these.

## Scope

This connection covers the public reporting portal. The existing staff `/auth` forms remain validation-only; staff provisioning, dashboard modules, report review actions and social login are separate unfinished features. No submission dispatches emergency responders automatically.

The backend creates PENDING_VERIFICATION reports and owns identity, status and timestamps. Client requests cannot assign those fields. Repeating an unchanged submission ID is idempotent. An ambiguous database failure may retain an uploaded photo to avoid deleting a committed report's image; a future maintenance job should reconcile unreferenced objects against stored report paths. Define retention and operational monitoring before production use.
