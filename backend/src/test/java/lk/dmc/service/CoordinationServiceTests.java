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
    void unknownShelterIsNotFound() {
        assertStatus(HttpStatus.NOT_FOUND, () -> service.shelter("SH-NOPE"));
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
