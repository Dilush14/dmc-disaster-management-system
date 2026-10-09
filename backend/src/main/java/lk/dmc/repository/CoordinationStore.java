package lk.dmc.repository;

import java.util.List;
import java.util.Map;
import java.util.function.Function;

/** Persistence boundary for shelters, resources and distributions. Writes run atomically inside transaction(). */
public interface CoordinationStore {
    String SHELTERS = "shelters";
    String RESOURCES = "reliefResources";
    String DISTRIBUTIONS = "resourceDistributions";
    String OCCUPANCY_HISTORY = "shelterOccupancyHistory";
    String EMERGENCY_RESPONSES = "emergencyResponses";
    String RESCUE_TEAMS = "rescueTeams";

    List<Map<String, Object>> list(String collection);
    Map<String, Object> find(String collection, String id);
    /** All reads must happen before writes; if work throws, nothing is committed. */
    <T> T transaction(Function<Tx, T> work);

    interface Tx {
        Map<String, Object> get(String collection, String id);
        void set(String collection, String id, Map<String, Object> data);
    }
}
