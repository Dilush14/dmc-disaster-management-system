package lk.dmc.support;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import lk.dmc.repository.CoordinationStore;

/** Rescue teams and an active emergency response for coordination tests (production stores start empty). */
public final class RescueOperationFixtures {
    private static final String NOW = "2026-09-14T06:00:00Z";

    private RescueOperationFixtures() {}

    public static void seed(CoordinationStore store) {
        store.transaction(tx -> {
            emergencyResponse(tx, "ER-001", "FLOOD", "Colombo", "Colombo Flood Response", "ACTIVE", NOW,
                List.of("Kelani River Basin", "Kolonnawa"));

            team(tx, "RT-001", "DMC Colombo Rapid Response", "DMC", "Colombo", 12, "Mr. S. Rajapaksha", "077 111 2233",
                List.of("Evacuation", "First Aid"), "AVAILABLE");
            team(tx, "RT-002", "Navy Boat Rescue Unit 4", "Navy", "Colombo", 10, "Lt. K. Senanayake", "077 222 3344",
                List.of("Boat Rescue", "Evacuation"), "AVAILABLE");
            team(tx, "RT-003", "Colombo Fire Brigade Team B", "Fire Service", "Colombo", 8, "Mr. P. Weerasinghe", "077 333 4455",
                List.of("Heavy Lifting", "First Aid"), "AVAILABLE");
            team(tx, "RT-004", "Red Cross First Aid Team", "Red Cross", "Colombo", 6, "Ms. H. Mendis", "077 444 5566",
                List.of("First Aid"), "DISPATCHED");
            team(tx, "RT-005", "Army Engineering Squad 2", "Sri Lanka Army", "Gampaha", 20, "Capt. R. Abeysekara", "077 555 6677",
                List.of("Heavy Lifting", "Evacuation"), "AVAILABLE");
            team(tx, "RT-006", "Kalutara Police Rescue", "Police", "Kalutara", 9, "IP N. Kumara", "077 666 7788",
                List.of("Evacuation", "First Aid"), "RESPONDING");
            team(tx, "RT-007", "Sarvodaya Volunteer Team", "NGO", "Kandy", 15, "Mr. J. Ariyaratne", "077 777 8899",
                List.of("First Aid", "Evacuation"), "UNAVAILABLE");
            team(tx, "RT-008", "Ratnapura DMC Field Unit", "DMC", "Ratnapura", 11, "Ms. W. Karunaratne", "077 888 9900",
                List.of("Boat Rescue", "First Aid"), "COMM_FAILURE");
            return null;
        });
    }

    private static void team(CoordinationStore.Tx tx, String id, String name, String agency, String district, long members,
        String leader, String phone, List<String> capabilities, String status) {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("id", id);
        row.put("name", name);
        row.put("agency", agency);
        row.put("district", district);
        row.put("memberCount", members);
        row.put("leader", leader);
        row.put("contactNumber", phone);
        row.put("capabilities", capabilities);
        row.put("status", status);
        row.put("currentAssignmentId", "DISPATCHED".equals(status) || "RESPONDING".equals(status) ? "ER-001" : null);
        row.put("updatedAt", NOW);
        tx.set(CoordinationStore.RESCUE_TEAMS, id, row);
    }

    private static void emergencyResponse(CoordinationStore.Tx tx, String id, String hazardType, String district, String title,
        String status, String startedAt, List<String> affectedAreas) {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("id", id);
        row.put("hazardType", hazardType);
        row.put("district", district);
        row.put("title", title);
        row.put("status", status);
        row.put("startedAt", startedAt);
        row.put("affectedAreas", affectedAreas);
        tx.set(CoordinationStore.EMERGENCY_RESPONSES, id, row);
    }
}
