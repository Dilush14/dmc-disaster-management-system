# Verification - 7 October 2026

## Passed

- Backend compilation and all 19 tests pass after the final repository timeout change: health/security/CORS (5), public API authentication/roles/validation (9), report ownership/idempotency/server-owned fields (3), photo validation (2).
- All 7 frontend validation/state unit tests pass.
- All 8 existing staff browser checks pass, including responsive authentication layouts and reduced motion.
- Production build passed earlier during integration. The final rerun after CSS cleanup failed with Node native out-of-memory; it did not report a source compilation error.
- Git whitespace checks pass. Only safe `.env.example` templates are tracked; environment files and log/build/test artifacts remain ignored.

## Not yet verified

- The 10 updated public browser cases have not completed successfully. The first run encountered `ERR_INSUFFICIENT_RESOURCES`, then lost the Vite server. A separate public-only retry encountered page-setup timeouts and Windows error 1450 while Vite tried to spawn a thread. It was stopped after the resource failure. Do not count these as passed.
- Browser fixtures explicitly replace Firebase identity and API responses only within tests. Production code contains no fake-session or report-storage fallback. The tests exercise the real frontend HTTP adapter, but cannot establish live cloud connectivity.
- Live Firebase Auth, Firestore and Storage require the user to create/configure a project using FIREBASE_SETUP.md. No cloud resources or rules have been deployed, and no live cloud end-to-end test has run.
- Physical-device GPS/camera behavior, staff authentication/dashboard functionality, report review administration and emergency dispatch are not verified or implemented by this integration.

## Recheck after freeing system resources

Frontend: `npm.cmd test`, `npm.cmd run build`, `npm.cmd run test:e2e`.
Backend: `.\mvnw.cmd test`.

For constrained environments, set `RAYON_NUM_THREADS=1` and `UV_THREADPOOL_SIZE=2`. Backend verification succeeded with `MAVEN_OPTS=-Xmx256m -XX:ReservedCodeCacheSize=64m -XX:ActiveProcessorCount=2 -XX:+UseSerialGC` and Maven `-DforkCount=0`. The browser suite uses installed Edge and one worker.
