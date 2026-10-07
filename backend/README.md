# DMC backend
See [project README](../README.md) for environment configuration and security boundaries.
Java 17+ required. Run `./mvnw spring-boot:run` or `.\mvnw.cmd spring-boot:run` on Windows. Run `./mvnw test` for verification. Public endpoint: `GET /api/health`.

If Windows reports insufficient memory or paging-file error 1455, run `.\run-low-memory.cmd`. This limits Maven to a 192 MB heap and the separate backend JVM to a 256 MB heap, with smaller initial heaps and Serial GC. These are local-development settings; total process memory also includes native memory outside the heap. The script keeps its environment changes local and starts from the backend directory so `.env` loads correctly.

If Windows still cannot allocate memory, close unused applications or restart Windows. Check Windows **Advanced system settings > Performance Settings > Advanced > Virtual memory**, enable automatic paging-file management, and restart if prompted. Ensure the paging-file drive has free space. Firebase configuration is still required for authenticated operations.
