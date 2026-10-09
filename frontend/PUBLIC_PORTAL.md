# Public mobile hazard reporting

The React portal at `/public` shares the blue/navy theme with the existing staff pages. Its screens include welcome, login/signup, home, hazard type, details/location, optional photo, review, confirmation, My Reports, report details and profile.

## Connection

Follow [Firebase setup](../FIREBASE_SETUP.md). Authentication uses Firebase email/password, session or remembered persistence, password reset and logout. The backend verifies ID tokens and resolves CITIZEN or COMMUNITY_VOLUNTEER roles. Staff claims cannot access public APIs. Profile name, phone and public account type are saved in Firestore. Missing configuration produces an error; arbitrary credentials do not create a local session.

All API requests send a Firebase bearer ID token to VITE_API_BASE_URL:

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET/POST | /api/public/profile | Read/create the authenticated public profile |
| POST | /api/public/hazard-reports | Multipart report JSON and optional photo |
| GET | /api/public/hazard-reports/my | Current user's reports |
| GET | /api/public/hazard-reports/{id} | Owned report details |
| GET | /api/public/hazard-reports/{id}/photo | Authenticated private image |

Submission JSON contains hazardType, description, latitude, longitude, dateTime (UTC ISO string) and clientRequestId. Identity, status, report ID and timestamps come from the server. The server rejects unknown fields and invalid inputs, checks image bytes and ownership, and deduplicates retries. Photos never use public download URLs. Reports are stored in Firestore `hazardReports`; profiles in `publicUsers`.

## Drafts and validation

Drafts remain in React memory across steps and clear after success or refresh. GPS failure offers retry and manual coordinates. The location panel is illustrative, not a live map. Description is required (500 characters maximum), coordinate ranges are checked, and future dates are rejected. Optional JPEG/PNG photos are limited to 2 MB; the server also limits decoded dimensions. Camera/GPS support depends on the browser, and geolocation needs localhost or HTTPS.

My Reports uses backend records only, with Pending, Verified, Rejected and Suspicious statuses. There are no sample reports or fake announcements. Review/status administration is not implemented in this feature.

## Verification

Run `npm.cmd test`, `npm.cmd run build`, and `npm.cmd run test:e2e`. Browser tests use explicit test-only auth/API fixtures while exercising the frontend HTTP adapter. They do not prove connectivity to a live Firebase project. Backend tests separately check authorization, validation, ownership, uploads and idempotency. See [verification status](../VERIFICATION.md).
