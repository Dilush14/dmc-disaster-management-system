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
    /** Team states owned by an assignment; availability cannot be changed by hand while in one of these. */
    private static final Set<String> ON_ASSIGNMENT = Set.of("ASSIGNED", "DISPATCHED", "RESPONDING");
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

    // ---- Rescue teams ----

    public List<Map<String, Object>> listTeams(String district, String status) {
        return store.list(RESCUE_TEAMS).stream()
            .filter(row -> matchesDistrict(row, district))
            .filter(row -> status == null || status.isBlank() || status.equalsIgnoreCase(String.valueOf(row.get("status"))))
            .sorted(Comparator.comparing(row -> String.valueOf(row.get("id"))))
            .toList();
    }

    public Map<String, Object> getTeam(String id) {
        return requireRow(RESCUE_TEAMS, id, "Rescue team");
    }

    public Map<String, Object> createTeam(TeamRequest request, String actorId) {
        String id = newId("RT");
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("id", id);
        applyTeam(row, request, actorId);
        row.put("status", "AVAILABLE");
        row.put("currentAssignmentId", null);
        store.transaction(tx -> {
            tx.set(RESCUE_TEAMS, id, row);
            return null;
        });
        return row;
    }

    public Map<String, Object> updateTeam(String id, TeamRequest request, String actorId) {
        return store.transaction(tx -> {
            Map<String, Object> row = requireRow(tx.get(RESCUE_TEAMS, id), "Rescue team");
            applyTeam(row, request, actorId);
            tx.set(RESCUE_TEAMS, id, row);
            return row;
        });
    }

    /** Marks a team available or unavailable. Blocked while the team is on an assignment so dispatch state stays consistent. */
    public Map<String, Object> setAvailability(String id, TeamAvailabilityRequest request, String actorId) {
        return store.transaction(tx -> {
            Map<String, Object> row = requireRow(tx.get(RESCUE_TEAMS, id), "Rescue team");
            String current = String.valueOf(row.get("status"));
            if (ON_ASSIGNMENT.contains(current))
                throw new ResponseStatusException(HttpStatus.CONFLICT, row.get("name") + " is currently "
                    + current.toLowerCase(Locale.ROOT) + " and its availability cannot be changed until the assignment ends.");
            if (current.equals(request.status()))
                return row;
            row.put("status", request.status());
            row.put("updatedAt", now());
            row.put("updatedBy", actorId);
            tx.set(RESCUE_TEAMS, id, row);
            return row;
        });
    }

    // ---- Team assignments ----

    public List<Map<String, Object>> listAssignments(String status) {
        return store.list(TEAM_ASSIGNMENTS).stream()
            .filter(row -> status == null || status.isBlank() || status.equalsIgnoreCase(String.valueOf(row.get("status"))))
            .sorted(Comparator.comparing((Map<String, Object> row) -> String.valueOf(row.get("assignedAt"))).reversed())
            .toList();
    }

    public Map<String, Object> getAssignment(String id) {
        return requireRow(TEAM_ASSIGNMENTS, id, "Team assignment");
    }

    /** Assigns an available team to move evacuees to a shelter. Capacity and team availability are re-checked inside one transaction. */
    public Map<String, Object> assignTeam(AssignTeamRequest request, String actorId) {
        return assignTeam(request, actorId, null);
    }

    public Map<String, Object> assignTeam(AssignTeamRequest request, String actorId, String actorName) {
        return store.transaction(tx -> {
            Map<String, Object> shelter = requireRow(tx.get(SHELTERS, request.shelterId()), "Shelter");
            Map<String, Object> team = requireRow(tx.get(RESCUE_TEAMS, request.teamId()), "Rescue team");
            long space = num(shelter.get("capacity")) - num(shelter.get("occupied"));
            if (!Boolean.TRUE.equals(shelter.get("active")) || request.expectedEvacuees() > space)
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Insufficient capacity: " + shelter.get("name") + " can take "
                    + Math.max(0, space) + " more people but " + request.expectedEvacuees() + " are expected.");
            if (!"AVAILABLE".equals(team.get("status")))
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Team is no longer available: " + team.get("name") + " is "
                    + String.valueOf(team.get("status")).toLowerCase(Locale.ROOT).replace('_', ' ') + ".");
            SupportPlan support = readSupport(tx, request.teamId(), List.of(), request.supportTeamIds(), request.supportResources());

            String now = now();
            String id = newId("TA");
            Map<String, Object> assignment = new LinkedHashMap<>();
            assignment.put("id", id);
            assignment.put("teamId", request.teamId());
            assignment.put("teamName", team.get("name"));
            assignment.put("shelterId", request.shelterId());
            assignment.put("shelterName", shelter.get("name"));
            assignment.put("district", shelter.get("district"));
            assignment.put("expectedEvacuees", request.expectedEvacuees().longValue());
            assignment.put("pickupLocation", request.pickupLocation().trim());
            assignment.put("notes", blankToEmpty(request.notes()));
            assignment.put("supportTeamIds", List.of());
            assignment.put("supportTeams", List.of());
            assignment.put("supportResources", List.of());
            assignment.put("status", "ASSIGNED");
            assignment.put("assignedBy", actorId);
            assignment.put("assignedAt", now);
            assignment.put("dispatchedAt", null);
            assignment.put("arrivedAt", null);
            assignment.put("completedAt", null);
            assignment.put("evacueesDelivered", 0L);
            List<Object> history = new ArrayList<>();
            history.add(historyEntry("ASSIGNED", now, actorId, actorName, "Team assigned to " + shelter.get("name")));
            if (!support.isEmpty())
                history.add(historyEntry("ASSIGNED", now, actorId, actorName, support.describe()));
            assignment.put("history", history);

            team.put("status", "ASSIGNED");
            team.put("currentAssignmentId", id);
            team.put("updatedAt", now);
            team.put("updatedBy", actorId);
            tx.set(RESCUE_TEAMS, request.teamId(), team);
            writeSupport(tx, support, assignment, now, actorId);
            tx.set(TEAM_ASSIGNMENTS, id, assignment);
            return assignment;
        });
    }

    /** Adds support teams and relief stock to an assignment that is assigned or dispatched, all in one transaction. */
    public Map<String, Object> addSupport(String id, AssignmentSupportRequest request, String actorId) {
        return addSupport(id, request, actorId, null);
    }

    public Map<String, Object> addSupport(String id, AssignmentSupportRequest request, String actorId, String actorName) {
        if (isEmpty(request.supportTeamIds()) && isEmpty(request.supportResources()))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Choose at least one support team or resource.");
        return store.transaction(tx -> {
            Map<String, Object> assignment = requireRow(tx.get(TEAM_ASSIGNMENTS, id), "Team assignment");
            String current = String.valueOf(assignment.get("status"));
            if (!Set.of("ASSIGNED", "DISPATCHED").contains(current))
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Support can only be added to assigned or dispatched teams (this one is "
                    + current.toLowerCase(Locale.ROOT).replace('_', ' ') + ").");
            SupportPlan support = readSupport(tx, String.valueOf(assignment.get("teamId")), supportTeamIds(assignment),
                request.supportTeamIds(), request.supportResources());

            String now = now();
            List<Object> history = new ArrayList<>(assignment.get("history") instanceof List<?> list ? list : List.of());
            history.add(historyEntry(current, now, actorId, actorName, support.describe()));
            assignment.put("history", history);
            writeSupport(tx, support, assignment, now, actorId);
            tx.set(TEAM_ASSIGNMENTS, id, assignment);
            return assignment;
        });
    }

    /** Cancels an assignment that has not been dispatched yet, frees its teams and returns its support stock. */
    public Map<String, Object> cancelAssignment(String id, String actorId) {
        return cancelAssignment(id, actorId, null);
    }

    public Map<String, Object> cancelAssignment(String id, String actorId, String actorName) {
        return store.transaction(tx -> {
            Map<String, Object> assignment = requireRow(tx.get(TEAM_ASSIGNMENTS, id), "Team assignment");
            Map<String, Map<String, Object>> teams = readTeams(tx, assignment);
            String current = String.valueOf(assignment.get("status"));
            if (!"ASSIGNED".equals(current))
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Only assignments that have not been dispatched can be cancelled (this one is "
                    + current.toLowerCase(Locale.ROOT).replace('_', ' ') + ").");
            Map<String, Map<String, Object>> resources = new LinkedHashMap<>();
            for (Map<?, ?> item : supportResources(assignment)) {
                String resourceId = String.valueOf(item.get("resourceId"));
                if (resources.containsKey(resourceId)) continue;
                Map<String, Object> resource = tx.get(RESOURCES, resourceId);
                if (resource != null) resources.put(resourceId, new LinkedHashMap<>(resource));
            }

            String now = now();
            for (Map<?, ?> item : supportResources(assignment)) {
                Map<String, Object> resource = resources.get(String.valueOf(item.get("resourceId")));
                if (resource != null) resource.put("available", num(resource.get("available")) + num(item.get("quantity")));
            }
            resources.forEach((resourceId, resource) -> {
                resource.put("updatedAt", now);
                tx.set(RESOURCES, resourceId, resource);
            });
            List<Object> history = new ArrayList<>(assignment.get("history") instanceof List<?> list ? list : List.of());
            history.add(historyEntry("CANCELLED", now, actorId, actorName,
                resources.isEmpty() ? "Assignment cancelled" : "Assignment cancelled; support stock returned"));
            assignment.put("status", "CANCELLED");
            assignment.put("history", history);
            tx.set(TEAM_ASSIGNMENTS, id, assignment);
            moveTeams(tx, teams, id, "AVAILABLE", now, actorId);
            return assignment;
        });
    }

    /** Sends an assigned team out. Allowed from ASSIGNED, or COMM_FAILURE to retry a dispatch that did not reach the team. */
    public Map<String, Object> dispatch(String id, String actorId) {
        return dispatch(id, actorId, null);
    }

    public Map<String, Object> dispatch(String id, String actorId, String actorName) {
        return advanceAssignment(id, Set.of("ASSIGNED", "COMM_FAILURE"), "DISPATCHED", "dispatchedAt",
            actorId, actorName, "Team dispatched", "Only assigned teams can be dispatched");
    }

    /** Records that a dispatched team has started responding on the ground. */
    public Map<String, Object> markResponding(String id, String actorId) {
        return markResponding(id, actorId, null);
    }

    public Map<String, Object> markResponding(String id, String actorId, String actorName) {
        return advanceAssignment(id, Set.of("DISPATCHED"), "RESPONDING", "respondingAt",
            actorId, actorName, "Team responding", "Only dispatched teams can be marked as responding");
    }

    /**
     * Records a team's arrival at its shelter: the shelter occupancy, an occupancy history entry, the completed
     * assignment and the freed teams are written together, so a rejected arrival changes nothing.
     */
    public Map<String, Object> recordArrival(String id, ArrivalRequest request, String actorId) {
        return recordArrival(id, request, actorId, null);
    }

    public Map<String, Object> recordArrival(String id, ArrivalRequest request, String actorId, String actorName) {
        return store.transaction(tx -> {
            Map<String, Object> assignment = requireRow(tx.get(TEAM_ASSIGNMENTS, id), "Team assignment");
            String shelterId = String.valueOf(assignment.get("shelterId"));
            Map<String, Map<String, Object>> teams = readTeams(tx, assignment);
            Map<String, Object> shelter = requireRow(tx.get(SHELTERS, shelterId), "Shelter");
            String current = String.valueOf(assignment.get("status"));
            if (!Set.of("DISPATCHED", "RESPONDING").contains(current))
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Arrival can only be recorded for dispatched or responding teams (this one is "
                    + current.toLowerCase(Locale.ROOT).replace('_', ' ') + ").");
            long capacity = num(shelter.get("capacity"));
            long previous = num(shelter.get("occupied"));
            if (previous != request.expectedOccupancy())
                throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Occupancy was changed by someone else (now " + previous + "). Please review the latest value and try again.");
            long delivered = request.evacueesDelivered();
            long occupied = previous + delivered;
            if (occupied > capacity)
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Insufficient shelter capacity: " + delivered + " evacuees would bring "
                    + shelter.get("name") + " to " + occupied + ", above its capacity of " + capacity + ".");

            String now = now();
            shelter.put("occupied", occupied);
            shelter.put("updatedAt", now);
            String historyId = newId("OH");
            Map<String, Object> occupancy = new LinkedHashMap<>();
            occupancy.put("id", historyId);
            occupancy.put("shelterId", shelterId);
            occupancy.put("assignmentId", id);
            occupancy.put("previousOccupied", previous);
            occupancy.put("occupied", occupied);
            occupancy.put("capacity", capacity);
            occupancy.put("note", "Arrival from " + assignment.get("teamName"));
            occupancy.put("recordedAt", now);
            tx.set(SHELTERS, shelterId, shelter);
            tx.set(OCCUPANCY_HISTORY, historyId, occupancy);

            List<Object> history = new ArrayList<>(assignment.get("history") instanceof List<?> list ? list : List.of());
            history.add(historyEntry("COMPLETED", now, actorId, actorName, delivered + " evacuees delivered to " + shelter.get("name")));
            assignment.put("status", "COMPLETED");
            assignment.put("evacueesDelivered", delivered);
            assignment.put("arrivedAt", now);
            assignment.put("completedAt", now);
            assignment.put("history", history);
            tx.set(TEAM_ASSIGNMENTS, id, assignment);
            moveTeams(tx, teams, id, "AVAILABLE", now, actorId);

            Map<String, Object> result = new LinkedHashMap<>();
            result.put("assignment", assignment);
            result.put("shelterId", shelterId);
            result.put("shelterName", shelter.get("name"));
            result.put("capacity", capacity);
            result.put("previousOccupied", previous);
            result.put("occupied", occupied);
            result.put("previousAvailable", Math.max(0, capacity - previous));
            result.put("available", Math.max(0, capacity - occupied));
            return result;
        });
    }

    /** Moves an assignment and its primary and support teams to the next status together, in one transaction. */
    private Map<String, Object> advanceAssignment(String id, Set<String> allowedFrom, String next, String timestampField,
                                                  String actorId, String actorName, String note, String conflictMessage) {
        return store.transaction(tx -> {
            Map<String, Object> assignment = requireRow(tx.get(TEAM_ASSIGNMENTS, id), "Team assignment");
            Map<String, Map<String, Object>> teams = readTeams(tx, assignment);
            String current = String.valueOf(assignment.get("status"));
            if (!allowedFrom.contains(current))
                throw new ResponseStatusException(HttpStatus.CONFLICT, conflictMessage + " (this one is "
                    + current.toLowerCase(Locale.ROOT).replace('_', ' ') + ").");

            String now = now();
            List<Object> history = new ArrayList<>(assignment.get("history") instanceof List<?> list ? list : List.of());
            history.add(historyEntry(next, now, actorId, actorName, note));
            assignment.put("status", next);
            assignment.put(timestampField, now);
            assignment.put("history", history);
            tx.set(TEAM_ASSIGNMENTS, id, assignment);
            moveTeams(tx, teams, id, next, now, actorId);
            return assignment;
        });
    }

    /** Support teams and stock read and checked inside a transaction, ready to be written. */
    private record SupportPlan(Map<String, Map<String, Object>> teams, Map<String, Map<String, Object>> resources,
                               Map<String, Integer> quantities) {
        boolean isEmpty() {
            return teams.isEmpty() && quantities.isEmpty();
        }
        String describe() {
            List<String> parts = new ArrayList<>();
            if (!teams.isEmpty())
                parts.add("support teams " + teams.values().stream().map(team -> String.valueOf(team.get("name"))).collect(Collectors.joining(", ")));
            if (!quantities.isEmpty())
                parts.add("resources " + quantities.entrySet().stream()
                    .map(entry -> entry.getValue() + " " + resources.get(entry.getKey()).get("name")).collect(Collectors.joining(", ")));
            return "Support added: " + String.join("; ", parts);
        }
    }

    /** Reads and validates requested support. Performs reads only, so it must run before any write in the transaction. */
    private static SupportPlan readSupport(CoordinationStore.Tx tx, String primaryTeamId, List<String> existingTeamIds,
                                           List<String> teamIds, List<AssignTeamRequest.SupportResource> items) {
        List<String> requested = teamIds == null ? List.of() : teamIds.stream().map(String::trim).distinct().toList();
        if (requested.contains(primaryTeamId))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "A support team must be different from the primary team.");
        if (existingTeamIds.size() + requested.size() > 5)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "An assignment can have at most 5 support teams.");
        Map<String, Map<String, Object>> teams = new LinkedHashMap<>();
        for (String teamId : requested) {
            Map<String, Object> team = requireRow(tx.get(RESCUE_TEAMS, teamId), "Support team");
            if (existingTeamIds.contains(teamId))
                throw new ResponseStatusException(HttpStatus.CONFLICT, team.get("name") + " is already supporting this assignment.");
            if (!"AVAILABLE".equals(team.get("status")))
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Support team is no longer available: " + team.get("name") + " is "
                    + String.valueOf(team.get("status")).toLowerCase(Locale.ROOT).replace('_', ' ') + ".");
            teams.put(teamId, team);
        }
        Map<String, Integer> quantities = new LinkedHashMap<>();
        if (items != null) items.forEach(item -> quantities.merge(item.resourceId(), item.quantity(), Integer::sum));
        Map<String, Map<String, Object>> resources = new LinkedHashMap<>();
        for (var entry : quantities.entrySet()) {
            Map<String, Object> resource = requireRow(tx.get(RESOURCES, entry.getKey()), "Resource");
            long available = num(resource.get("available"));
            if (entry.getValue() > available)
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Insufficient stock for " + resource.get("name")
                    + ": requested " + entry.getValue() + ", available " + available + ".");
            resources.put(entry.getKey(), resource);
        }
        return new SupportPlan(teams, resources, quantities);
    }

    /** Holds the support teams at the assignment's status, reserves the stock and records both on the assignment. */
    private static void writeSupport(CoordinationStore.Tx tx, SupportPlan plan, Map<String, Object> assignment, String now, String actorId) {
        String assignmentId = String.valueOf(assignment.get("id"));
        String status = String.valueOf(assignment.get("status"));
        List<String> teamIds = new ArrayList<>(supportTeamIds(assignment));
        List<Object> teamSummaries = new ArrayList<>(assignment.get("supportTeams") instanceof List<?> list ? list : List.of());
        plan.teams().forEach((teamId, team) -> {
            team.put("status", status);
            team.put("currentAssignmentId", assignmentId);
            team.put("updatedAt", now);
            team.put("updatedBy", actorId);
            tx.set(RESCUE_TEAMS, teamId, team);
            teamIds.add(teamId);
            Map<String, Object> summary = new LinkedHashMap<>();
            summary.put("id", teamId);
            summary.put("name", team.get("name"));
            summary.put("agency", team.get("agency"));
            summary.put("memberCount", team.get("memberCount"));
            teamSummaries.add(summary);
        });
        Map<String, Map<String, Object>> reserved = new LinkedHashMap<>();
        for (Map<?, ?> item : supportResources(assignment)) {
            Map<String, Object> copy = new LinkedHashMap<>();
            item.forEach((key, value) -> copy.put(String.valueOf(key), value));
            reserved.put(String.valueOf(item.get("resourceId")), copy);
        }
        plan.resources().forEach((resourceId, resource) -> {
            long quantity = plan.quantities().get(resourceId);
            resource.put("available", num(resource.get("available")) - quantity);
            resource.put("updatedAt", now);
            tx.set(RESOURCES, resourceId, resource);
            Map<String, Object> item = reserved.computeIfAbsent(resourceId, ignored -> {
                Map<String, Object> row = new LinkedHashMap<>();
                row.put("resourceId", resourceId);
                row.put("name", resource.get("name"));
                row.put("unit", resource.get("unit"));
                row.put("quantity", 0L);
                return row;
            });
            item.put("quantity", num(item.get("quantity")) + quantity);
        });
        assignment.put("supportTeamIds", teamIds);
        assignment.put("supportTeams", teamSummaries);
        assignment.put("supportResources", new ArrayList<>(reserved.values()));
    }

    /** Reads the primary and support teams of an assignment, skipping any that no longer exist. */
    private static Map<String, Map<String, Object>> readTeams(CoordinationStore.Tx tx, Map<String, Object> assignment) {
        List<String> ids = new ArrayList<>();
        ids.add(String.valueOf(assignment.get("teamId")));
        ids.addAll(supportTeamIds(assignment));
        Map<String, Map<String, Object>> teams = new LinkedHashMap<>();
        for (String teamId : ids) {
            Map<String, Object> team = tx.get(RESCUE_TEAMS, teamId);
            if (team != null) teams.put(teamId, new LinkedHashMap<>(team));
        }
        return teams;
    }

    /** Moves every team still held by this assignment to the given status; AVAILABLE releases it. */
    private static void moveTeams(CoordinationStore.Tx tx, Map<String, Map<String, Object>> teams, String assignmentId,
                                  String status, String now, String actorId) {
        teams.forEach((teamId, team) -> {
            if (!assignmentId.equals(team.get("currentAssignmentId"))) return;
            team.put("status", status);
            if ("AVAILABLE".equals(status)) team.put("currentAssignmentId", null);
            team.put("updatedAt", now);
            team.put("updatedBy", actorId);
            tx.set(RESCUE_TEAMS, teamId, team);
        });
    }

    private static List<String> supportTeamIds(Map<String, Object> assignment) {
        return assignment.get("supportTeamIds") instanceof List<?> list ? list.stream().map(String::valueOf).toList() : List.of();
    }

    @SuppressWarnings("unchecked")
    private static List<Map<?, ?>> supportResources(Map<String, Object> assignment) {
        return assignment.get("supportResources") instanceof List<?> list ? (List<Map<?, ?>>) list : List.of();
    }

    private static boolean isEmpty(List<?> list) {
        return list == null || list.isEmpty();
    }

    private static Map<String, Object> historyEntry(String status, String at, String by, String byName, String note) {
        Map<String, Object> entry = new LinkedHashMap<>();
        entry.put("status", status);
        entry.put("at", at);
        entry.put("by", by);
        entry.put("byName", byName);
        entry.put("note", note);
        return entry;
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

    private void applyTeam(Map<String, Object> row, TeamRequest request, String actorId) {
        row.put("name", request.name().trim());
        row.put("agency", request.agency());
        row.put("district", request.district().trim());
        row.put("memberCount", request.memberCount().longValue());
        row.put("leader", request.leader().trim());
        row.put("contactNumber", request.contactNumber().trim());
        row.put("capabilities", request.capabilities().stream().distinct().toList());
        row.put("updatedAt", now());
        row.put("updatedBy", actorId);
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
