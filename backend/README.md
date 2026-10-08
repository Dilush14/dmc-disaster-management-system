# DMC backend
See [project README](../README.md) for environment configuration and security boundaries.
Java 17+ required. Run `./mvnw spring-boot:run` or `.\mvnw.cmd spring-boot:run` on Windows. Run `./mvnw test` for verification. Public endpoint: `GET /api/health`.

If Windows reports insufficient memory or paging-file error 1455, run `.\run-low-memory.cmd`. This limits Maven to a 192 MB heap and the separate backend JVM to a 256 MB heap, with smaller initial heaps and Serial GC. These are local-development settings; total process memory also includes native memory outside the heap. The script keeps its environment changes local and starts from the backend directory so `.env` loads correctly.

If Windows still cannot allocate memory, close unused applications or restart Windows. Check Windows **Advanced system settings > Performance Settings > Advanced > Virtual memory**, enable automatic paging-file management, and restart if prompted. Ensure the paging-file drive has free space. Firebase configuration is still required for authenticated operations.

## Resources & Shelters staff API
`/api/staff/resources-shelters` covers shelters (list, details, register, edit, occupancy updates), relief resources (stock), distributions (allocate, status changes), the overview dashboard and shortage alerts.

- Access requires a signed-in staff account (DMC Officer, District Officer or Response Team Member).
- With `FIREBASE_ENABLED=false`, data lives in memory with demo seed data and resets on restart. With Firebase enabled, data lives in the `shelters`, `reliefResources`, `resourceDistributions` and `shelterOccupancyHistory` collections; set `COORDINATION_SEED=true` once to seed an empty project.
- Occupancy updates and allocations run in transactions, so a failed write leaves the last valid values in place. Occupancy updates send the value the officer last saw (`expectedOccupancy`) and return 409 if it changed in the meantime.
