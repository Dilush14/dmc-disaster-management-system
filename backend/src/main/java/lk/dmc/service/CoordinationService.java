package lk.dmc.service;

import java.time.Clock;
import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;
import lk.dmc.dto.*;
import lk.dmc.repository.CoordinationStore;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import static lk.dmc.repository.CoordinationStore.*;

/** Coordinates emergency shelters and relief resources: capacity, occupancy, stock and distributions. */
@Service
public class CoordinationService {
    private static final Set<String> TERMINAL = Set.of("COMPLETED", "CANCELLED");
    private final CoordinationStore store;
    private final Clock clock;

    @Autowired
    public CoordinationService(CoordinationStore store) {
        this(store, Clock.systemUTC());
    }
    CoordinationService(CoordinationStore store, Clock clock) {
        this.store = store;
        this.clock = clock;
    }

    // ---- Emergency responses ----

    /** Active emergency responses (newest first), optionally limited to one district. */
    public List<Map<String, Object>> activeResponses(String district) {
        return store.list(EMERGENCY_RESPONSES).stream()
            .filter(row -> "ACTIVE".equals(row.get("status")))
            .filter(row -> matchesDistrict(row, district))
            .sorted(Comparator.comparing((Map<String, Object> row) -> String.valueOf(row.get("startedAt"))).reversed())
            .toList();
    }

    // ---- Shelters ----

    public List<Map<String, Object>> shelters(String district) {
        return store.list(SHELTERS).stream()
            .filter(row -> matchesDistrict(row, district))
            .sorted(Comparator.comparing(row -> String.valueOf(row.get("id"))))
            .map(CoordinationService::shelterView).toList();
    }

    public Map<String, Object> shelter(String id) {
        Map<String, Object> view = shelterView(requireRow(SHELTERS, id, "Shelter"));
        view.put("history", store.list(OCCUPANCY_HISTORY).stream()
            .filter(row -> id.equals(row.get("shelterId")))
            .sorted(Comparator.comparing((Map<String, Object> row) -> String.valueOf(row.get("recordedAt"))).reversed())
            .toList());
        view.put("distributions", store.list(DISTRIBUTIONS).stream()
            .filter(row -> id.equals(row.get("shelterId")))
            .sorted(Comparator.comparing((Map<String, Object> row) -> String.valueOf(row.get("createdAt"))).reversed())
            .toList());
        return view;
    }

    public Map<String, Object> createShelter(ShelterRequest request) {
        String id = newId("SH");
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("id", id);
        applyShelter(row, request);
        row.put("occupied", 0L);
        store.transaction(tx -> {
            tx.set(SHELTERS, id, row);
            return null;
        });
        return shelterView(row);
    }

    public Map<String, Object> updateShelter(String id, ShelterRequest request) {
        return shelterView(store.transaction(tx -> {
            Map<String, Object> row = requireRow(tx.get(SHELTERS, id), "Shelter");
            long occupied = num(row.get("occupied"));
            if (request.capacity() < occupied)
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Capacity cannot be lower than the current occupancy of " + occupied + ".");
            applyShelter(row, request);
            tx.set(SHELTERS, id, row);
            return row;
        }));
    }

    /** Records evacuee movement into a shelter. Runs in a transaction so a failed update keeps the last valid values. */
    public Map<String, Object> updateOccupancy(String id, OccupancyUpdateRequest request) {
        return shelterView(store.transaction(tx -> {
            Map<String, Object> row = requireRow(tx.get(SHELTERS, id), "Shelter");
            long capacity = num(row.get("capacity"));
            long current = num(row.get("occupied"));
            if (!Boolean.TRUE.equals(row.get("active")))
                throw new ResponseStatusException(HttpStatus.CONFLICT, "This shelter is inactive and cannot receive evacuees.");
            if (current != request.expectedOccupancy())
                throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Occupancy was changed by someone else (now " + current + "). Please review the latest value and try again.");
            if (request.occupied() > capacity)
                throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Insufficient shelter capacity: " + request.occupied() + " people exceeds the capacity of " + capacity + ".");
            String now = now();
            row.put("occupied", request.occupied().longValue());
            row.put("updatedAt", now);
            String historyId = newId("OH");
            Map<String, Object> history = new LinkedHashMap<>();
            history.put("id", historyId);
            history.put("shelterId", id);
            history.put("previousOccupied", current);
            history.put("occupied", request.occupied().longValue());
            history.put("capacity", capacity);
            history.put("recordedAt", now);
            tx.set(SHELTERS, id, row);
            tx.set(OCCUPANCY_HISTORY, historyId, history);
            return row;
        }));
    }

    // ---- Resources ----

    public List<Map<String, Object>> resources() {
        return store.list(RESOURCES).stream()
            .sorted(Comparator.comparing(row -> String.valueOf(row.get("id"))))
            .map(CoordinationService::resourceView).toList();
    }

    public Map<String, Object> createResource(ResourceRequest request) {
        validateStock(request);
        String id = newId("RS");
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("id", id);
        applyResource(row, request);
        store.transaction(tx -> {
            tx.set(RESOURCES, id, row);
            return null;
        });
        return resourceView(row);
    }

    public Map<String, Object> updateResource(String id, ResourceRequest request) {
        validateStock(request);
        return resourceView(store.transaction(tx -> {
            Map<String, Object> row = requireRow(tx.get(RESOURCES, id), "Resource");
            applyResource(row, request);
            tx.set(RESOURCES, id, row);
            return row;
        }));
    }

    // ---- Distributions ----

    public List<Map<String, Object>> distributions(String district) {
        return store.list(DISTRIBUTIONS).stream()
            .filter(row -> matchesDistrict(row, district))
            .sorted(Comparator.comparing((Map<String, Object> row) -> String.valueOf(row.get("createdAt"))).reversed())
            .toList();
    }

    /** Allocates relief resources to a shelter, reserving stock atomically. */
    public Map<String, Object> allocate(DistributionRequest request) {
        Map<String, Integer> quantities = new LinkedHashMap<>();
        request.items().forEach(item -> quantities.merge(item.resourceId(), item.quantity(), Integer::sum));
        return store.transaction(tx -> {
            Map<String, Object> shelter = requireRow(tx.get(SHELTERS, request.shelterId()), "Shelter");
            if (!Boolean.TRUE.equals(shelter.get("active")))
                throw new ResponseStatusException(HttpStatus.CONFLICT, "The selected shelter is inactive. Please choose another shelter.");
            long space = num(shelter.get("capacity")) - num(shelter.get("occupied"));
            int expected = request.expectedPeople() == null ? 0 : request.expectedPeople();
            if (expected > space)
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Insufficient shelter capacity: " + shelter.get("name")
                    + " can take " + space + " more people but " + expected + " are expected.");

            Map<String, Map<String, Object>> resources = new LinkedHashMap<>();
            for (var entry : quantities.entrySet()) {
                Map<String, Object> resource = requireRow(tx.get(RESOURCES, entry.getKey()), "Resource");
                long available = num(resource.get("available"));
                if (entry.getValue() > available)
                    throw new ResponseStatusException(HttpStatus.CONFLICT, "Insufficient stock for " + resource.get("name")
                        + ": requested " + entry.getValue() + ", available " + available + ".");
                resources.put(entry.getKey(), resource);
            }

            String now = now();
            List<Map<String, Object>> items = new ArrayList<>();
            resources.forEach((resourceId, resource) -> {
                long quantity = quantities.get(resourceId);
                resource.put("available", num(resource.get("available")) - quantity);
                resource.put("updatedAt", now);
                tx.set(RESOURCES, resourceId, resource);
                items.add(Map.of("resourceId", resourceId, "name", resource.get("name"), "unit", resource.get("unit"), "quantity", quantity));
            });

            String id = newId("RD");
            Map<String, Object> distribution = new LinkedHashMap<>();
            distribution.put("id", id);
            distribution.put("items", items);
            distribution.put("shelterId", request.shelterId());
            distribution.put("shelterName", shelter.get("name"));
            distribution.put("district", shelter.get("district"));
            distribution.put("distributionDate", request.distributionDate().toString());
            distribution.put("transportMethod", request.transportMethod());
            distribution.put("notes", request.notes() == null ? "" : request.notes().trim());
            distribution.put("expectedPeople", (long) expected);
            distribution.put("status", "PENDING");
            distribution.put("createdAt", now);
            tx.set(DISTRIBUTIONS, id, distribution);
            return distribution;
        });
    }

    /** Moves a distribution forward; cancelling returns its reserved stock. */
    public Map<String, Object> updateDistributionStatus(String id, DistributionStatusRequest request) {
        return store.transaction(tx -> {
            Map<String, Object> row = requireRow(tx.get(DISTRIBUTIONS, id), "Distribution");
            String current = String.valueOf(row.get("status"));
            if (TERMINAL.contains(current))
                throw new ResponseStatusException(HttpStatus.CONFLICT, "This distribution is already " + current.toLowerCase() + ".");
            if (current.equals(request.status()))
                return row;
            if ("CANCELLED".equals(request.status())) {
                Map<String, Map<String, Object>> resources = new LinkedHashMap<>();
                for (Map<?, ?> item : items(row)) {
                    String resourceId = String.valueOf(item.get("resourceId"));
                    Map<String, Object> resource = resources.containsKey(resourceId) ? resources.get(resourceId) : tx.get(RESOURCES, resourceId);
                    if (resource == null) continue;
                    resource.put("available", num(resource.get("available")) + num(item.get("quantity")));
                    resources.put(resourceId, resource);
                }
                resources.forEach((resourceId, resource) -> tx.set(RESOURCES, resourceId, resource));
            }
            row.put("status", request.status());
            row.put("updatedAt", now());
            tx.set(DISTRIBUTIONS, id, row);
            return row;
        });
    }

    // ---- Dashboard ----

    public Map<String, Object> overview(String district) {
        List<Map<String, Object>> shelters = shelters(district);
        long capacity = shelters.stream().mapToLong(row -> num(row.get("capacity"))).sum();
        long occupied = shelters.stream().mapToLong(row -> num(row.get("occupied"))).sum();
        Map<String, Object> view = new LinkedHashMap<>();
        view.put("totalShelters", shelters.size());
        view.put("activeShelters", shelters.stream().filter(row -> Boolean.TRUE.equals(row.get("active"))).count());
        view.put("totalCapacity", capacity);
        view.put("currentOccupied", occupied);
        view.put("occupancyRate", rate(occupied, capacity));
        view.put("byDistrict", shelters.stream()
            .collect(Collectors.groupingBy(row -> String.valueOf(row.get("district")), TreeMap::new, Collectors.toList()))
            .entrySet().stream().map(entry -> {
                long districtCapacity = entry.getValue().stream().mapToLong(row -> num(row.get("capacity"))).sum();
                long districtOccupied = entry.getValue().stream().mapToLong(row -> num(row.get("occupied"))).sum();
                return Map.<String, Object>of("district", entry.getKey(), "capacity", districtCapacity,
                    "occupied", districtOccupied, "occupancyRate", rate(districtOccupied, districtCapacity));
            }).toList());
        view.put("resources", resources());
        view.put("recentUpdates", shelters.stream()
            .sorted(Comparator.comparing((Map<String, Object> row) -> String.valueOf(row.get("updatedAt"))).reversed())
            .limit(5).toList());
        return view;
    }

    public Map<String, Object> alerts() {
        List<Map<String, Object>> shelterAlerts = shelters(null).stream()
            .filter(row -> Boolean.TRUE.equals(row.get("active")) && num(row.get("occupancyRate")) >= 75)
            .sorted(Comparator.comparingLong((Map<String, Object> row) -> num(row.get("occupancyRate"))).reversed())
            .map(row -> {
                long percent = num(row.get("occupancyRate"));
                return Map.<String, Object>of("shelterId", row.get("id"), "name", row.get("name"), "district", row.get("district"),
                    "occupancyRate", percent, "level", percent >= 100 ? "Critical" : percent >= 85 ? "High" : "Medium");
            }).toList();
        List<Map<String, Object>> resourceAlerts = resources().stream()
            .filter(row -> !"Available".equals(row.get("status")))
            .sorted(Comparator.comparingLong(row -> num(row.get("available"))))
            .map(row -> Map.<String, Object>of("resourceId", row.get("id"), "name", row.get("name"), "available", row.get("available"),
                "unit", row.get("unit"),
                "level", num(row.get("available")) * 2 <= num(row.get("lowStockThreshold")) ? "Critical" : "Low Stock"))
            .toList();
        return Map.of("shelterAlerts", shelterAlerts, "resourceAlerts", resourceAlerts);
    }

    // ---- Helpers ----

    static Map<String, Object> shelterView(Map<String, Object> row) {
        Map<String, Object> view = new LinkedHashMap<>(row);
        long capacity = num(row.get("capacity"));
        long occupied = num(row.get("occupied"));
        boolean active = Boolean.TRUE.equals(row.get("active"));
        view.put("available", Math.max(0, capacity - occupied));
        view.put("occupancyRate", rate(occupied, capacity));
        view.put("status", !active ? "Inactive" : occupied >= capacity ? "Full" : "Active");
        return view;
    }

    static Map<String, Object> resourceView(Map<String, Object> row) {
        Map<String, Object> view = new LinkedHashMap<>(row);
        long available = num(row.get("available"));
        view.put("status", available == 0 ? "Out of Stock" : available <= num(row.get("lowStockThreshold")) ? "Low Stock" : "Available");
        return view;
    }

    private void applyShelter(Map<String, Object> row, ShelterRequest request) {
        row.put("name", request.name().trim());
        row.put("district", request.district().trim());
        row.put("address", request.address().trim());
        row.put("shelterType", request.shelterType().trim());
        row.put("managingOrganization", blankToEmpty(request.managingOrganization()));
        row.put("contactPerson", blankToEmpty(request.contactPerson()));
        row.put("contactNumber", blankToEmpty(request.contactNumber()));
        row.put("capacity", request.capacity().longValue());
        row.put("active", request.active());
        row.put("facilities", request.facilities() == null ? List.of() : List.copyOf(request.facilities()));
        row.put("updatedAt", now());
    }

    private void applyResource(Map<String, Object> row, ResourceRequest request) {
        row.put("name", request.name().trim());
        row.put("category", request.category());
        row.put("unit", request.unit().trim());
        row.put("totalQuantity", request.totalQuantity().longValue());
        row.put("available", request.available().longValue());
        row.put("lowStockThreshold", request.lowStockThreshold().longValue());
        row.put("updatedAt", now());
    }

    private static void validateStock(ResourceRequest request) {
        if (request.available() > request.totalQuantity())
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Available quantity cannot exceed the total quantity.");
    }

    private Map<String, Object> requireRow(String collection, String id, String label) {
        return requireRow(store.find(collection, id), label);
    }

    private static Map<String, Object> requireRow(Map<String, Object> row, String label) {
        if (row == null)
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, label + " was not found.");
        return new LinkedHashMap<>(row);
    }

    @SuppressWarnings("unchecked")
    private static List<Map<?, ?>> items(Map<String, Object> row) {
        return row.get("items") instanceof List<?> list ? (List<Map<?, ?>>) list : List.of();
    }

    private static boolean matchesDistrict(Map<String, Object> row, String district) {
        return district == null || district.isBlank() || district.equalsIgnoreCase(String.valueOf(row.get("district")));
    }

    static long num(Object value) {
        return value instanceof Number number ? number.longValue() : 0L;
    }

    private static long rate(long part, long whole) {
        return whole <= 0 ? 0 : Math.round(part * 100.0 / whole);
    }

    private static String blankToEmpty(String value) {
        return value == null ? "" : value.trim();
    }

    private String now() {
        return Instant.now(clock).toString();
    }

    private static String newId(String prefix) {
        return prefix + "-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase(Locale.ROOT);
    }
}
