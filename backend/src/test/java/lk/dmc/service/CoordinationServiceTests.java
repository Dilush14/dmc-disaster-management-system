package lk.dmc.service;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import lk.dmc.dto.*;
import lk.dmc.repository.CoordinationStore;
import lk.dmc.repository.InMemoryCoordinationStore;
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
        service = new CoordinationService(store);
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

    private static TeamRequest teamRequest(String name) {
        return new TeamRequest(name, "Navy", "Galle", 4, "Lt. A. Perera", "077 123 0000", List.of("Boat Rescue", "First Aid", "Boat Rescue"));
    }

    private static DistributionRequest request(String shelterId, int expectedPeople, DistributionRequest.Item... items) {
        return new DistributionRequest(List.of(items), shelterId, LocalDate.now().plusDays(1), "DMC Vehicle", "", expectedPeople);
    }

    private static DistributionRequest.Item item(String resourceId, int quantity) {
        return new DistributionRequest.Item(resourceId, quantity);
    }

    private static void assertStatus(HttpStatus status, org.junit.jupiter.api.function.Executable action) {
        var error = assertThrows(ResponseStatusException.class, action);
        assertEquals(status, error.getStatusCode());
    }
}
