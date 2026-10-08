# Desktop authentication connection

The `/auth` login and `/auth?mode=signup` registration forms use `services/firebase/staffAuthService.js`. Public authentication remains separate under `/public`.

- Login sends email/password to Firebase Authentication, obtains an ID token, and calls `GET /api/staff/profile` with a bearer token before navigating to `/staff/monitoring`.
- Registration creates the Firebase Auth account, updates its display name, and posts name/phone/requestedRole to `POST /api/staff/registration`. The backend stores the validated role with status ACTIVE in `staffRegistrations/{uid}`, then the frontend reads the staff profile and opens the staff portal.
- Remember me selects local persistence; unchecked login and registration use session persistence. Forgot password sends Firebase reset instructions for the entered email.
- Inputs and API failures appear on the form. Buttons are disabled while requests are pending. If account creation succeeds but staff setup fails, the message explains that the account exists and suggests retrying login or contacting the administrator.
- Staff self-registration supports exactly DMC Officer (DMC_OFFICER), District Officer (DISTRICT_OFFICER), and Response Team Member (RESPONSE_TEAM_MEMBER). Per the requested university-demo behavior, the selected role is granted immediately without an approval step. Registration is idempotent and does not overwrite an existing staff role. Google and Microsoft buttons remain unavailable.
- Staff route access comes from the backend-verified profile. Local storage cannot grant a staff role, and there is no default officer session. The backend verifies Firebase ID tokens and resolves a trusted custom role claim first, then an active staff registration, then the public profile/default public role. Public-role accounts cannot access `/api/staff/profile`; staff accounts cannot use public-only APIs.

The frontend role selector is not the security boundary: the backend validates the exact staff-role whitelist, sets identity/status itself, and rejects forged extra fields. Keep direct browser access to the staffRegistrations collection denied in Firestore rules, as with other server-managed records. This demo intentionally permits any authenticated registrant to select a staff role; deployment with real operational users needs a separate provisioning policy.

Both forms require the existing frontend Firebase variables and `VITE_API_BASE_URL`. Backend `.env` must enable Firebase and supply the project ID, bucket and usable Admin credentials (for local development, `GOOGLE_APPLICATION_CREDENTIALS` points to a private service-account JSON outside the repository). Starting the backend with Firebase disabled allows its health endpoint to run but does not enable authenticated profile requests. No environment files were changed by this integration.

Verification uses the real frontend authentication service and HTTP adapter with explicit test-only Firebase SDK and backend responses. It does not create cloud accounts or prove live Firebase connectivity. Run `npm.cmd test`, `npm.cmd run build`, and `npm.cmd run test:e2e -- desktop-auth.spec.js auth.spec.js` from `frontend`.

On 8 October 2026, the production build, 14 unit tests, 22 backend tests, eight layout browser checks and eight staff-auth browser checks passed. The combined browser run hit Windows memory exhaustion after the layout checks; the staff checks passed when run separately with `NODE_OPTIONS=--max-old-space-size=256 --max-semi-space-size=2`. The production build still reports a large main-bundle warning.
