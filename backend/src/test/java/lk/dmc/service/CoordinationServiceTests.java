package lk.dmc.service;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import lk.dmc.dto.*;
import lk.dmc.repository.CoordinationStore;
import lk.dmc.repository.InMemoryCoordinationStore;
import lk.dmc.support.RescueOperationFixtures;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import static org.junit.jupiter.api.Assertions.*;

class CoordinationServiceTests {
    private CoordinationStore store;
    private CoordinationService service;

    @BeforeEach
    void setUp() {
        store = new InMemoryCoordinationStore();
        seedOperationalFixtures();
        RescueOperationFixtures.seed(store);
        service = new CoordinationService(store);
    }

    @Test
    void freshInMemoryStoreDoesNotContainDemoRecords() {
        var freshStore = new InMemoryCoordinationStore();

        assertTrue(freshStore.list(CoordinationStore.SHELTERS).isEmpty());
        assertTrue(freshStore.list(CoordinationStore.RESOURCES).isEmpty());
        assertTrue(freshStore.list(CoordinationStore.DISTRIBUTIONS).isEmpty());
    }

    @Test
    void occupancyUpdateRecalculatesAvailableSpace() {
        // Use case scenario: capacity 500, occupancy 380 -> 120 available; 50 evacuees arrive -> 430 / 70.
        assertEquals(120L, service.shelter("SH-009").get("available"));
        var updated = service.updateOccupancy("SH-009", new OccupancyUpdateRequest(430, 380));
        assertEquals(430L, updated.get("occupied"));
        assertEquals(70L, updated.get("available"));
        assertEquals(1, ((List<?>) service.shelter("SH-009").get("history")).size());
    }

    @Test
    void occupancyAboveCapacityIsRejectedAndNotSaved() {
        assertStatus(HttpStatus.CONFLICT, () -> service.updateOccupancy("SH-009", new OccupancyUpdateRequest(501, 380)));
        assertEquals(380L, store.find(CoordinationStore.SHELTERS, "SH-009").get("occupied"));
    }

    @Test
    void staleOccupancyIsRejected() {
        service.updateOccupancy("SH-009", new OccupancyUpdateRequest(400, 380));
        assertStatus(HttpStatus.CONFLICT, () -> service.updateOccupancy("SH-009", new OccupancyUpdateRequest(430, 380)));
        assertEquals(400L, store.find(CoordinationStore.SHELTERS, "SH-009").get("occupied"));
    }

    @Test
    void allocationReservesStockAndRecordsDistribution() {
        var distribution = service.allocate(request("SH-002", 0, item("RS-001", 500), item("RS-002", 1000)));
        assertEquals("PENDING", distribution.get("status"));
        assertEquals(11950L, store.find(CoordinationStore.RESOURCES, "RS-001").get("available"));
        assertEquals(7200L, store.find(CoordinationStore.RESOURCES, "RS-002").get("available"));
    }

    @Test
    void insufficientStockRollsBackEveryItem() {
        assertStatus(HttpStatus.CONFLICT, () -> service.allocate(request("SH-002", 0, item("RS-001", 500), item("RS-003", 1000))));
        assertEquals(12450L, store.find(CoordinationStore.RESOURCES, "RS-001").get("available"));
        assertEquals(580L, store.find(CoordinationStore.RESOURCES, "RS-003").get("available"));
    }

    @Test
    void insufficientShelterCapacityIsRejected() {
        // Kalutara Vidyalaya: 600 capacity, 580 occupied -> 20 places.
        assertStatus(HttpStatus.CONFLICT, () -> service.allocate(request("SH-003", 150, item("RS-001", 10))));
    }

    @Test
    void inactiveShelterCannotReceiveAllocations() {
        assertStatus(HttpStatus.CONFLICT, () -> service.allocate(request("SH-010", 0, item("RS-001", 10))));
    }

    @Test
    void cancellingDistributionReturnsStock() {
        var distribution = service.allocate(request("SH-002", 0, item("RS-004", 200)));
        service.updateDistributionStatus(String.valueOf(distribution.get("id")), new DistributionStatusRequest("CANCELLED"));
        assertEquals(1200L, store.find(CoordinationStore.RESOURCES, "RS-004").get("available"));
        assertStatus(HttpStatus.CONFLICT, () ->
            service.updateDistributionStatus(String.valueOf(distribution.get("id")), new DistributionStatusRequest("COMPLETED")));
    }

    @Test
    void shelterCapacityCannotDropBelowOccupancy() {
        var request = new ShelterRequest("Colombo Central School", "Colombo", "Colombo 07", "School", "DMC", "", "", 700, true, List.of());
        assertStatus(HttpStatus.BAD_REQUEST, () -> service.updateShelter("SH-001", request));
    }

    @Test
    void alertsFlagFullSheltersAndLowStock() {
        Map<String, Object> alerts = service.alerts();
        var shelters = (List<?>) alerts.get("shelterAlerts");
        var resources = (List<?>) alerts.get("resourceAlerts");
        assertTrue(shelters.stream().anyMatch(row -> "Critical".equals(((Map<?, ?>) row).get("level"))));
        assertTrue(resources.stream().anyMatch(row -> "Portable Generators".equals(((Map<?, ?>) row).get("name"))
            && "Critical".equals(((Map<?, ?>) row).get("level"))));
    }

    @Test
    void activeResponsesAreFilteredByDistrictAndStatus() {
        var colombo = service.activeResponses("Colombo");
        assertEquals(1, colombo.size());
        assertEquals("Colombo Flood Response", colombo.get(0).get("title"));
        assertEquals(List.of("Kelani River Basin", "Kolonnawa"), colombo.get(0).get("affectedAreas"));
        assertTrue(service.activeResponses("Kandy").isEmpty());
        store.transaction(tx -> {
            var row = tx.get(CoordinationStore.EMERGENCY_RESPONSES, "ER-001");
            row.put("status", "CLOSED");
            tx.set(CoordinationStore.EMERGENCY_RESPONSES, "ER-001", row);
            return null;
        });
        assertTrue(service.activeResponses(null).isEmpty());
    }

    @Test
    void unknownShelterIsNotFound() {
        assertStatus(HttpStatus.NOT_FOUND, () -> service.shelter("SH-NOPE"));
    }

    @Test
    void teamsAreFilteredByDistrictAndStatus() {
        assertEquals(8, service.listTeams(null, null).size());
        var colomboAvailable = service.listTeams("Colombo", "AVAILABLE");
        assertTrue(colomboAvailable.size() >= 3);
        assertTrue(colomboAvailable.stream().allMatch(row -> "Colombo".equals(row.get("district")) && "AVAILABLE".equals(row.get("status"))));
        assertEquals("RT-004", service.listTeams("colombo", "dispatched").get(0).get("id"));
    }

    @Test
    void createdTeamIsAvailableAndRecordsActor() {
        var team = service.createTeam(teamRequest("Galle Navy Rescue"), "officer-1");
        assertEquals("AVAILABLE", team.get("status"));
        assertEquals("officer-1", team.get("updatedBy"));
        assertEquals(List.of("Boat Rescue", "First Aid"), service.getTeam(String.valueOf(team.get("id"))).get("capabilities"));
    }

    @Test
    void updatingTeamKeepsStatus() {
        var updated = service.updateTeam("RT-004", teamRequest("Red Cross First Aid Team"), "officer-1");
        assertEquals("DISPATCHED", updated.get("status"));
        assertEquals(4L, updated.get("memberCount"));
    }

    @Test
    void availabilityCanBeToggledWhenNotOnAssignment() {
        var team = service.setAvailability("RT-001", new TeamAvailabilityRequest("UNAVAILABLE"), "officer-1");
        assertEquals("UNAVAILABLE", team.get("status"));
        assertEquals("UNAVAILABLE", store.find(CoordinationStore.RESCUE_TEAMS, "RT-001").get("status"));
    }

    @Test
    void availabilityIsBlockedWhileDispatched() {
        assertStatus(HttpStatus.CONFLICT, () -> service.setAvailability("RT-004", new TeamAvailabilityRequest("AVAILABLE"), "officer-1"));
        assertEquals("DISPATCHED", store.find(CoordinationStore.RESCUE_TEAMS, "RT-004").get("status"));
    }

    @Test
    void unknownTeamIsNotFound() {
        assertStatus(HttpStatus.NOT_FOUND, () -> service.getTeam("RT-NOPE"));
        assertStatus(HttpStatus.NOT_FOUND, () -> service.setAvailability("RT-NOPE", new TeamAvailabilityRequest("AVAILABLE"), "officer-1"));
    }

    @Test
    void assigningTeamMarksItAssignedAndRecordsAssignment() {
        var assignment = service.assignTeam(assign("RT-001", "SH-009", 50), "officer-1");
        String id = String.valueOf(assignment.get("id"));
        assertTrue(id.startsWith("TA-"));
        assertEquals("ASSIGNED", assignment.get("status"));
        assertEquals("Colombo Community Centre", assignment.get("shelterName"));
        assertEquals("officer-1", assignment.get("assignedBy"));
        assertEquals(1, ((List<?>) assignment.get("history")).size());
        var team = store.find(CoordinationStore.RESCUE_TEAMS, "RT-001");
        assertEquals("ASSIGNED", team.get("status"));
        assertEquals(id, team.get("currentAssignmentId"));
        assertEquals(id, service.listAssignments(null).get(0).get("id"));
    }

    @Test
    void assignmentHistoryRecordsOfficerName() {
        var assignment = service.assignTeam(assign("RT-001", "SH-009", 50), "officer-1", "Mohammed Hamza");
        var cancelled = service.cancelAssignment(String.valueOf(assignment.get("id")), "officer-1", "Mohammed Hamza");
        var history = (List<?>) cancelled.get("history");
        assertEquals(2, history.size());
        for (Object entry : history) {
            assertEquals("officer-1", ((Map<?, ?>) entry).get("by"));
            assertEquals("Mohammed Hamza", ((Map<?, ?>) entry).get("byName"));
        }
    }

    @Test
    void insufficientCapacityIsRejectedAndNothingSaved() {
        // Kalutara Vidyalaya: 20 places left.
        var error = assertThrows(ResponseStatusException.class, () -> service.assignTeam(assign("RT-001", "SH-003", 21), "officer-1"));
        assertEquals(HttpStatus.CONFLICT, error.getStatusCode());
        assertTrue(error.getReason().startsWith("Insufficient capacity"));
        assertEquals("AVAILABLE", store.find(CoordinationStore.RESCUE_TEAMS, "RT-001").get("status"));
        assertTrue(store.list(CoordinationStore.TEAM_ASSIGNMENTS).isEmpty());
        assertStatus(HttpStatus.CONFLICT, () -> service.assignTeam(assign("RT-001", "SH-010", 1), "officer-1"));
    }

    @Test
    void unavailableTeamCannotBeAssigned() {
        var error = assertThrows(ResponseStatusException.class, () -> service.assignTeam(assign("RT-004", "SH-009", 10), "officer-1"));
        assertEquals(HttpStatus.CONFLICT, error.getStatusCode());
        assertTrue(error.getReason().startsWith("Team is no longer available"));
        service.assignTeam(assign("RT-001", "SH-009", 10), "officer-1");
        assertStatus(HttpStatus.CONFLICT, () -> service.assignTeam(assign("RT-001", "SH-001", 10), "officer-2"));
        assertEquals(1, store.list(CoordinationStore.TEAM_ASSIGNMENTS).size());
    }

    @Test
    void cancellingAssignmentFreesTeam() {
        String id = String.valueOf(service.assignTeam(assign("RT-002", "SH-009", 10), "officer-1").get("id"));
        var cancelled = service.cancelAssignment(id, "officer-1");
        assertEquals("CANCELLED", cancelled.get("status"));
        assertEquals(2, ((List<?>) service.getAssignment(id).get("history")).size());
        var team = store.find(CoordinationStore.RESCUE_TEAMS, "RT-002");
        assertEquals("AVAILABLE", team.get("status"));
        assertNull(team.get("currentAssignmentId"));
        assertStatus(HttpStatus.CONFLICT, () -> service.cancelAssignment(id, "officer-1"));
        assertStatus(HttpStatus.NOT_FOUND, () -> service.cancelAssignment("TA-NOPE", "officer-1"));
    }

    @Test
    void dispatchMovesAssignmentAndTeamTogether() {
        String id = String.valueOf(service.assignTeam(assign("RT-002", "SH-009", 10), "officer-1").get("id"));
        var dispatched = service.dispatch(id, "officer-1", "Mohammed Hamza");
        assertEquals("DISPATCHED", dispatched.get("status"));
        assertNotNull(dispatched.get("dispatchedAt"));
        var history = (List<?>) service.getAssignment(id).get("history");
        assertEquals(2, history.size());
        assertEquals("DISPATCHED", ((Map<?, ?>) history.get(1)).get("status"));
        assertEquals("DISPATCHED", store.find(CoordinationStore.RESCUE_TEAMS, "RT-002").get("status"));
        assertStatus(HttpStatus.CONFLICT, () -> service.cancelAssignment(id, "officer-1"));
    }

    @Test
    void secondDispatchIsRejected() {
        String id = String.valueOf(service.assignTeam(assign("RT-002", "SH-009", 10), "officer-1").get("id"));
        service.dispatch(id, "officer-1");
        assertStatus(HttpStatus.CONFLICT, () -> service.dispatch(id, "officer-1"));
        assertEquals(2, ((List<?>) service.getAssignment(id).get("history")).size());
        assertStatus(HttpStatus.NOT_FOUND, () -> service.dispatch("TA-NOPE", "officer-1"));
    }

    @Test
    void respondingFollowsDispatchOnly() {
        String id = String.valueOf(service.assignTeam(assign("RT-002", "SH-009", 10), "officer-1").get("id"));
        assertStatus(HttpStatus.CONFLICT, () -> service.markResponding(id, "officer-1"));
        service.dispatch(id, "officer-1");
        var responding = service.markResponding(id, "officer-1");
        assertEquals("RESPONDING", responding.get("status"));
        assertEquals("RESPONDING", store.find(CoordinationStore.RESCUE_TEAMS, "RT-002").get("status"));
        assertStatus(HttpStatus.CONFLICT, () -> service.dispatch(id, "officer-1"));
    }

    @Test
    void arrivalUpdatesShelterCompletesAssignmentAndFreesTeam() {
        // Use case scenario: capacity 500, occupancy 380 (120 available); 50 evacuees arrive -> 430 / 70.
        String id = String.valueOf(service.assignTeam(assign("RT-002", "SH-009", 50), "officer-1").get("id"));
        service.dispatch(id, "officer-1");
        var result = service.recordArrival(id, new ArrivalRequest(50, 380), "officer-1", "Mohammed Hamza");
        assertEquals(380L, result.get("previousOccupied"));
        assertEquals(430L, result.get("occupied"));
        assertEquals(120L, result.get("previousAvailable"));
        assertEquals(70L, result.get("available"));

        var assignment = service.getAssignment(id);
        assertEquals("COMPLETED", assignment.get("status"));
        assertEquals(50L, assignment.get("evacueesDelivered"));
        assertNotNull(assignment.get("arrivedAt"));
        assertNotNull(assignment.get("completedAt"));
        assertEquals(430L, store.find(CoordinationStore.SHELTERS, "SH-009").get("occupied"));
        var history = (List<?>) service.shelter("SH-009").get("history");
        assertEquals(1, history.size());
        assertTrue(String.valueOf(((Map<?, ?>) history.get(0)).get("note")).startsWith("Arrival from "));
        var team = store.find(CoordinationStore.RESCUE_TEAMS, "RT-002");
        assertEquals("AVAILABLE", team.get("status"));
        assertNull(team.get("currentAssignmentId"));
    }

    @Test
    void arrivalOverCapacityRollsBackAssignmentAndShelter() {
        String id = String.valueOf(service.assignTeam(assign("RT-002", "SH-009", 50), "officer-1").get("id"));
        service.dispatch(id, "officer-1");
        service.markResponding(id, "officer-1");
        assertStatus(HttpStatus.CONFLICT, () -> service.recordArrival(id, new ArrivalRequest(121, 380), "officer-1"));
        assertEquals(380L, store.find(CoordinationStore.SHELTERS, "SH-009").get("occupied"));
        assertEquals("RESPONDING", service.getAssignment(id).get("status"));
        assertEquals("RESPONDING", store.find(CoordinationStore.RESCUE_TEAMS, "RT-002").get("status"));
        assertTrue(((List<?>) service.shelter("SH-009").get("history")).isEmpty());
    }

    @Test
    void arrivalWithStaleOccupancyIsRejected() {
        String id = String.valueOf(service.assignTeam(assign("RT-002", "SH-009", 50), "officer-1").get("id"));
        service.dispatch(id, "officer-1");
        service.updateOccupancy("SH-009", new OccupancyUpdateRequest(400, 380));
        assertStatus(HttpStatus.CONFLICT, () -> service.recordArrival(id, new ArrivalRequest(50, 380), "officer-1"));
        assertEquals(400L, store.find(CoordinationStore.SHELTERS, "SH-009").get("occupied"));
        assertEquals("DISPATCHED", service.getAssignment(id).get("status"));
    }

    @Test
    void arrivalRequiresDispatchedOrRespondingTeam() {
        String id = String.valueOf(service.assignTeam(assign("RT-002", "SH-009", 50), "officer-1").get("id"));
        assertStatus(HttpStatus.CONFLICT, () -> service.recordArrival(id, new ArrivalRequest(50, 380), "officer-1"));
        service.dispatch(id, "officer-1");
        service.recordArrival(id, new ArrivalRequest(50, 380), "officer-1");
        assertStatus(HttpStatus.CONFLICT, () -> service.recordArrival(id, new ArrivalRequest(10, 430), "officer-1"));
        assertStatus(HttpStatus.NOT_FOUND, () -> service.recordArrival("TA-NOPE", new ArrivalRequest(10, 430), "officer-1"));
    }

    @Test
    void supportTeamsAndStockAreHeldWithTheAssignment() {
        var assignment = service.assignTeam(supported(List.of("RT-002", "RT-003"), List.of(support("RS-003", 80), support("RS-003", 20))), "officer-1");
        String id = String.valueOf(assignment.get("id"));
        assertEquals(List.of("RT-002", "RT-003"), assignment.get("supportTeamIds"));
        assertEquals(2, ((List<?>) assignment.get("supportTeams")).size());
        var reserved = (List<?>) assignment.get("supportResources");
        assertEquals(1, reserved.size());
        assertEquals(100L, ((Map<?, ?>) reserved.get(0)).get("quantity"));
        assertEquals(480L, store.find(CoordinationStore.RESOURCES, "RS-003").get("available"));
        for (String teamId : List.of("RT-002", "RT-003")) {
            var team = store.find(CoordinationStore.RESCUE_TEAMS, teamId);
            assertEquals("ASSIGNED", team.get("status"));
            assertEquals(id, team.get("currentAssignmentId"));
        }
    }

    @Test
    void supportTeamsFollowThePrimaryThroughDispatchAndArrival() {
        String id = String.valueOf(service.assignTeam(supported(List.of("RT-002"), List.of()), "officer-1").get("id"));
        service.dispatch(id, "officer-1");
        assertEquals("DISPATCHED", store.find(CoordinationStore.RESCUE_TEAMS, "RT-002").get("status"));
        service.markResponding(id, "officer-1");
        assertEquals("RESPONDING", store.find(CoordinationStore.RESCUE_TEAMS, "RT-002").get("status"));
        service.recordArrival(id, new ArrivalRequest(10, 380), "officer-1");
        for (String teamId : List.of("RT-001", "RT-002")) {
            var team = store.find(CoordinationStore.RESCUE_TEAMS, teamId);
            assertEquals("AVAILABLE", team.get("status"));
            assertNull(team.get("currentAssignmentId"));
        }
    }

    @Test
    void shortSupportStockRollsBackTheWholeAssignment() {
        var error = assertThrows(ResponseStatusException.class,
            () -> service.assignTeam(supported(List.of("RT-002"), List.of(support("RS-001", 10), support("RS-005", 16))), "officer-1"));
        assertEquals(HttpStatus.CONFLICT, error.getStatusCode());
        assertTrue(error.getReason().startsWith("Insufficient stock for Portable Generators"));
        assertTrue(store.list(CoordinationStore.TEAM_ASSIGNMENTS).isEmpty());
        assertEquals("AVAILABLE", store.find(CoordinationStore.RESCUE_TEAMS, "RT-001").get("status"));
        assertEquals("AVAILABLE", store.find(CoordinationStore.RESCUE_TEAMS, "RT-002").get("status"));
        assertEquals(12450L, store.find(CoordinationStore.RESOURCES, "RS-001").get("available"));
    }

    @Test
    void supportTeamsMustBeAvailableAndDifferFromThePrimary() {
        assertStatus(HttpStatus.BAD_REQUEST, () -> service.assignTeam(supported(List.of("RT-001"), List.of()), "officer-1"));
        assertStatus(HttpStatus.CONFLICT, () -> service.assignTeam(supported(List.of("RT-004"), List.of()), "officer-1"));
        assertStatus(HttpStatus.NOT_FOUND, () -> service.assignTeam(supported(List.of("RT-NOPE"), List.of()), "officer-1"));
        assertTrue(store.list(CoordinationStore.TEAM_ASSIGNMENTS).isEmpty());
        assertEquals("AVAILABLE", store.find(CoordinationStore.RESCUE_TEAMS, "RT-001").get("status"));
    }

    @Test
    void cancellingFreesSupportTeamsAndReturnsStock() {
        String id = String.valueOf(service.assignTeam(supported(List.of("RT-002"), List.of(support("RS-004", 200))), "officer-1").get("id"));
        service.addSupport(id, new AssignmentSupportRequest(List.of("RT-003"), List.of(support("RS-004", 100))), "officer-1");
        assertEquals(900L, store.find(CoordinationStore.RESOURCES, "RS-004").get("available"));
        service.cancelAssignment(id, "officer-1");
        assertEquals(1200L, store.find(CoordinationStore.RESOURCES, "RS-004").get("available"));
        for (String teamId : List.of("RT-001", "RT-002", "RT-003")) {
            var team = store.find(CoordinationStore.RESCUE_TEAMS, teamId);
            assertEquals("AVAILABLE", team.get("status"));
            assertNull(team.get("currentAssignmentId"));
        }
    }

    @Test
    void supportAddedAfterDispatchJoinsAsDispatched() {
        String id = String.valueOf(service.assignTeam(assign("RT-001", "SH-009", 10), "officer-1").get("id"));
        service.dispatch(id, "officer-1");
        var updated = service.addSupport(id, new AssignmentSupportRequest(List.of("RT-005"), List.of()), "officer-1", "Mohammed Hamza");
        assertEquals(List.of("RT-005"), updated.get("supportTeamIds"));
        assertEquals("DISPATCHED", store.find(CoordinationStore.RESCUE_TEAMS, "RT-005").get("status"));
        assertEquals(3, ((List<?>) updated.get("history")).size());
        assertStatus(HttpStatus.CONFLICT, () -> service.addSupport(id, new AssignmentSupportRequest(List.of("RT-005"), List.of()), "officer-1"));
        assertStatus(HttpStatus.BAD_REQUEST, () -> service.addSupport(id, new AssignmentSupportRequest(List.of(), List.of()), "officer-1"));
        service.markResponding(id, "officer-1");
        assertStatus(HttpStatus.CONFLICT, () -> service.addSupport(id, new AssignmentSupportRequest(List.of("RT-002"), List.of()), "officer-1"));
        assertEquals("AVAILABLE", store.find(CoordinationStore.RESCUE_TEAMS, "RT-002").get("status"));
    }

    private static AssignTeamRequest supported(List<String> teamIds, List<AssignTeamRequest.SupportResource> resources) {
        return new AssignTeamRequest("RT-001", "SH-009", 10, "Kolonnawa junction", "", teamIds, resources);
    }

    private static AssignTeamRequest.SupportResource support(String resourceId, int quantity) {
        return new AssignTeamRequest.SupportResource(resourceId, quantity);
    }

    private static AssignTeamRequest assign(String teamId, String shelterId, int expected) {
        return new AssignTeamRequest(teamId, shelterId, expected, "Kolonnawa junction", "");
    }

    private static TeamRequest teamRequest(String name) {
        return new TeamRequest(name, "Navy", "Galle", 4, "Lt. A. Perera", "077 123 0000", List.of("Boat Rescue", "First Aid", "Boat Rescue"));
    }

    private static DistributionRequest request(String shelterId, int expectedPeople, DistributionRequest.Item... items) {
        return new DistributionRequest(List.of(items), shelterId, LocalDate.now().plusDays(1), "DMC Vehicle", "", expectedPeople);
    }

    private static DistributionRequest.Item item(String resourceId, int quantity) {
        return new DistributionRequest.Item(resourceId, quantity);
    }

    private void seedOperationalFixtures() {
        store.transaction(tx -> {
            tx.set(CoordinationStore.SHELTERS, "SH-001", shelter("SH-001", "Colombo Central School", "Colombo", 1000, 780, true));
            tx.set(CoordinationStore.SHELTERS, "SH-002", shelter("SH-002", "Gampaha Town Hall", "Gampaha", 800, 560, true));
            tx.set(CoordinationStore.SHELTERS, "SH-003", shelter("SH-003", "Kalutara Vidyalaya", "Kalutara", 600, 580, true));
            tx.set(CoordinationStore.SHELTERS, "SH-009", shelter("SH-009", "Colombo Community Centre", "Colombo", 500, 380, true));
            tx.set(CoordinationStore.SHELTERS, "SH-011", shelter("SH-011", "Full Response Shelter", "Colombo", 500, 500, true));
            tx.set(CoordinationStore.SHELTERS, "SH-010", shelter("SH-010", "Kurunegala Hall", "Kurunegala", 400, 0, false));
            tx.set(CoordinationStore.RESOURCES, "RS-001", resource("RS-001", "Food Packs", 12450, 2000));
            tx.set(CoordinationStore.RESOURCES, "RS-002", resource("RS-002", "Water Bottles", 8200, 3000));
            tx.set(CoordinationStore.RESOURCES, "RS-003", resource("RS-003", "Medical Kits", 580, 1000));
            tx.set(CoordinationStore.RESOURCES, "RS-004", resource("RS-004", "Blankets", 1200, 500));
            tx.set(CoordinationStore.RESOURCES, "RS-005", resource("RS-005", "Portable Generators", 15, 30));
            return null;
        });
    }

    private static Map<String, Object> shelter(String id, String name, String district, long capacity, long occupied, boolean active) {
        return Map.of("id", id, "name", name, "district", district, "address", "Test address", "shelterType", "Community Hall",
            "capacity", capacity, "occupied", occupied, "active", active, "facilities", List.of(), "updatedAt", "2026-09-10T00:00:00Z");
    }

    private static Map<String, Object> resource(String id, String name, long available, long lowStockThreshold) {
        return Map.of("id", id, "name", name, "category", "Relief", "unit", "Unit", "totalQuantity", available + 1000,
            "available", available, "lowStockThreshold", lowStockThreshold, "updatedAt", "2026-09-10T00:00:00Z");
    }

    private static void assertStatus(HttpStatus status, org.junit.jupiter.api.function.Executable action) {
        var error = assertThrows(ResponseStatusException.class, action);
        assertEquals(status, error.getStatusCode());
    }
}
