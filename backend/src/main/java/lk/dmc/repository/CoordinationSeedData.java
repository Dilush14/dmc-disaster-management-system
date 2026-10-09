package lk.dmc.repository;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** Demo shelters, relief stock and distributions for local development and first-time Firestore seeding. */
public final class CoordinationSeedData {
    private CoordinationSeedData() {}

    public static void seed(CoordinationStore store) {
        String now = Instant.now().toString();
        store.transaction(tx -> {
            shelter(tx, "SH-001", "Colombo Central School", "Colombo", "Colombo 07, Colombo", "School", 1000, 780, true, "Mr. S. Perera", "077 123 4567", now);
            shelter(tx, "SH-002", "Gampaha Town Hall", "Gampaha", "Main Street, Gampaha", "Community Hall", 800, 560, true, "Ms. N. Silva", "077 234 5678", now);
            shelter(tx, "SH-003", "Kalutara Vidyalaya", "Kalutara", "Galle Road, Kalutara", "School", 600, 580, true, "Mr. K. Fernando", "077 345 6789", now);
            shelter(tx, "SH-004", "Kandy Sports Complex", "Kandy", "Peradeniya Road, Kandy", "Sports Complex", 1200, 980, true, "Mr. R. Bandara", "077 456 7890", now);
            shelter(tx, "SH-005", "Matara Public Hall", "Matara", "Beach Road, Matara", "Community Hall", 750, 320, true, "Ms. D. Jayasuriya", "077 567 8901", now);
            shelter(tx, "SH-006", "Galle Municipal Hall", "Galle", "Church Street, Galle", "Community Hall", 900, 450, true, "Mr. A. Wickrama", "077 678 9012", now);
            shelter(tx, "SH-007", "Nuwara Eliya College", "Nuwara Eliya", "Lake Road, Nuwara Eliya", "School", 500, 500, true, "Ms. P. Herath", "077 789 0123", now);
            shelter(tx, "SH-008", "Ratnapura Central", "Ratnapura", "Main Street, Ratnapura", "School", 650, 553, true, "Mr. T. Gunasekara", "077 890 1234", now);
            shelter(tx, "SH-009", "Kolonnawa Community Centre", "Colombo", "Kolonnawa, Colombo", "Community Hall", 500, 380, true, "Mr. M. Nazeer", "077 901 2345", now);
            shelter(tx, "SH-010", "Kurunegala Temple Hall", "Kurunegala", "Dambulla Road, Kurunegala", "Religious Site", 400, 0, false, "Mr. L. Dissanayake", "077 012 3456", now);

            resource(tx, "RS-001", "Food Packs", "Food & Water", "Pack", 15000, 12450, 2000, now);
            resource(tx, "RS-002", "Water Bottles (1.5L)", "Food & Water", "Bottle", 20000, 8200, 3000, now);
            resource(tx, "RS-003", "Medical Kits", "Medical Supplies", "Kit", 5000, 580, 1000, now);
            resource(tx, "RS-004", "Blankets", "Relief Items", "Piece", 3000, 1200, 500, now);
            resource(tx, "RS-005", "Hygiene Kits", "Relief Items", "Kit", 2000, 950, 1000, now);
            resource(tx, "RS-006", "Tents", "Equipment", "Unit", 500, 120, 50, now);
            resource(tx, "RS-007", "Portable Generators", "Equipment", "Unit", 100, 15, 30, now);
            resource(tx, "RS-008", "Mattresses", "Relief Items", "Piece", 2500, 400, 500, now);

            distribution(tx, "RD-001", "RS-001", "Food Packs", "Pack", 500, "SH-002", "Gampaha Town Hall", "Gampaha", "2026-09-15", "PENDING");
            distribution(tx, "RD-002", "RS-002", "Water Bottles (1.5L)", "Bottle", 1000, "SH-001", "Colombo Central School", "Colombo", "2026-09-14", "COMPLETED");
            distribution(tx, "RD-003", "RS-004", "Blankets", "Piece", 300, "SH-004", "Kandy Sports Complex", "Kandy", "2026-09-13", "COMPLETED");
            distribution(tx, "RD-004", "RS-003", "Medical Kits", "Kit", 100, "SH-005", "Matara Public Hall", "Matara", "2026-09-13", "COMPLETED");
            distribution(tx, "RD-005", "RS-005", "Hygiene Kits", "Kit", 200, "SH-006", "Galle Municipal Hall", "Galle", "2026-09-12", "CANCELLED");

            emergencyResponse(tx, "ER-001", "FLOOD", "Colombo", "Colombo Flood Response", "ACTIVE", "2026-09-14T06:00:00Z",
                List.of("Kelani River Basin", "Kolonnawa"));
            return null;
        });
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

    private static void shelter(CoordinationStore.Tx tx, String id, String name, String district, String address, String type,
        long capacity, long occupied, boolean active, String contact, String phone, String now) {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("id", id);
        row.put("name", name);
        row.put("district", district);
        row.put("address", address);
        row.put("shelterType", type);
        row.put("managingOrganization", "DMC");
        row.put("contactPerson", contact);
        row.put("contactNumber", phone);
        row.put("capacity", capacity);
        row.put("occupied", occupied);
        row.put("active", active);
        row.put("facilities", List.of("Sleeping Area", "Toilets", "Clean Water", "Electricity", "Food Distribution", "Medical Room"));
        row.put("updatedAt", now);
        tx.set(CoordinationStore.SHELTERS, id, row);
    }

    private static void resource(CoordinationStore.Tx tx, String id, String name, String category, String unit,
        long total, long available, long threshold, String now) {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("id", id);
        row.put("name", name);
        row.put("category", category);
        row.put("unit", unit);
        row.put("totalQuantity", total);
        row.put("available", available);
        row.put("lowStockThreshold", threshold);
        row.put("updatedAt", now);
        tx.set(CoordinationStore.RESOURCES, id, row);
    }

    private static void distribution(CoordinationStore.Tx tx, String id, String resourceId, String resource, String unit, long quantity,
        String shelterId, String shelter, String district, String date, String status) {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("id", id);
        row.put("items", List.of(Map.of("resourceId", resourceId, "name", resource, "unit", unit, "quantity", quantity)));
        row.put("shelterId", shelterId);
        row.put("shelterName", shelter);
        row.put("district", district);
        row.put("distributionDate", date);
        row.put("transportMethod", "DMC Vehicle");
        row.put("notes", "");
        row.put("expectedPeople", 0L);
        row.put("status", status);
        row.put("createdAt", date + "T08:00:00Z");
        tx.set(CoordinationStore.DISTRIBUTIONS, id, row);
    }
}
