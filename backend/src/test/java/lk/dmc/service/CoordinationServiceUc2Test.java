package lk.dmc.service;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.*;
import java.util.function.Function;
import lk.dmc.dto.*;
import lk.dmc.repository.CoordinationStore;
import lk.dmc.repository.InMemoryCoordinationStore;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.function.Executable;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.ArgumentCaptor;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import static lk.dmc.repository.CoordinationStore.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * UC2 – Coordinate Emergency Resources &amp; Shelters.
 * The Firestore-backed store is replaced by a Mockito mock (or the in-memory store for atomicity checks),
 * so no test touches live Firebase.
 */
@DisplayName("UC2 CoordinationService")
class CoordinationServiceUc2Test {
    private static final Instant NOW = Instant.parse("2026-10-09T08:30:00Z");
    private static final String NOW_TEXT = NOW.toString();

    private CoordinationStore store;
    private CoordinationStore.Tx tx;
    private CoordinationService service;

    @BeforeEach
    @SuppressWarnings("unchecked")
    void setUp() {
        store = mock(CoordinationStore.class);
        tx = mock(CoordinationStore.Tx.class);
        // Run the transaction body against the mocked Tx so every write can be verified.
        when(store.transaction(any())).thenAnswer(call -> ((Function<CoordinationStore.Tx, Object>) call.getArgument(0)).apply(tx));
        // Unknown documents are absent (null) like in Firestore; Mockito would otherwise return an empty map.
        when(tx.get(anyString(), anyString())).thenReturn(null);
        when(store.find(anyString(), anyString())).thenReturn(null);
        service = new CoordinationService(store, Clock.fixed(NOW, ZoneOffset.UTC));
    }

    // ------------------------------------------------------------------ shelters

    @Nested
    @DisplayName("Shelter registration and capacity")
    class Shelters {
        @Test
        void shouldRegisterShelterWhenValidDataProvided() {
            // Arrange
            ShelterRequest request = shelterRequest("Colombo Central Emergency Shelter", "Colombo", 500, true);

            // Act
            Map<String, Object> view = service.createShelter(request);

            // Assert
            ArgumentCaptor<Map<String, Object>> saved = rowCaptor();
            verify(tx, times(1)).set(eq(SHELTERS), anyString(), saved.capture());
            Map<String, Object> row = saved.getValue();
            assertEquals("Colombo Central Emergency Shelter", row.get("name"));
            assertEquals("Colombo", row.get("district"));
            assertEquals(500L, row.get("capacity"));
            assertEquals(0L, row.get("occupied"));
            assertEquals("Sri Lanka Red Cross", row.get("managingOrganization"));
            assertEquals(NOW_TEXT, row.get("updatedAt"));
            assertTrue(String.valueOf(row.get("id")).startsWith("SH-"));
            assertEquals("Active", view.get("status"));
            assertEquals(500L, view.get("available"));
            assertEquals(0L, view.get("occupancyRate"));
        }

        @Test
        void shouldTrimShelterTextFieldsAndDefaultOptionalFields() {
            ShelterRequest request = new ShelterRequest("  Galle Hall ", " Galle ", " Main St ", " School ", null, null, null, 100, true, null);

            service.createShelter(request);

            ArgumentCaptor<Map<String, Object>> saved = rowCaptor();
            verify(tx).set(eq(SHELTERS), anyString(), saved.capture());
            assertEquals("Galle Hall", saved.getValue().get("name"));
            assertEquals("Galle", saved.getValue().get("district"));
            assertEquals("", saved.getValue().get("managingOrganization"));
            assertEquals(List.of(), saved.getValue().get("facilities"));
        }

        @Test
        void shouldShowRegisteredInactiveShelterAsInactive() {
            Map<String, Object> view = service.createShelter(shelterRequest("Closed Hall", "Kandy", 200, false));
            assertEquals("Inactive", view.get("status"));
        }

        @Test
        void shouldUpdateShelterCapacityWhenNotBelowOccupancy() {
            when(tx.get(SHELTERS, "SH-A")).thenReturn(shelter("SH-A", "Shelter A", "Colombo", 500, 200, true));

            Map<String, Object> view = service.updateShelter("SH-A", shelterRequest("Shelter A", "Colombo", 600, true));

            assertEquals(600L, view.get("capacity"));
            assertEquals(400L, view.get("available"));
            verify(tx).set(eq(SHELTERS), eq("SH-A"), anyMap());
        }

        @Test
        void shouldRejectCapacityReductionBelowCurrentOccupancy() {
            when(tx.get(SHELTERS, "SH-A")).thenReturn(shelter("SH-A", "Shelter A", "Colombo", 500, 200, true));

            ResponseStatusException error = assertStatus(HttpStatus.BAD_REQUEST,
                () -> service.updateShelter("SH-A", shelterRequest("Shelter A", "Colombo", 199, true)));

            assertTrue(error.getReason().contains("current occupancy of 200"));
            verify(tx, never()).set(anyString(), anyString(), anyMap());
        }

        @Test
        void shouldReturnNotFoundWhenUpdatingUnknownShelter() {
            when(tx.get(SHELTERS, "SH-NOPE")).thenReturn(null);

            assertStatus(HttpStatus.NOT_FOUND, () -> service.updateShelter("SH-NOPE", shelterRequest("X", "Colombo", 10, true)));
            verify(tx, never()).set(anyString(), anyString(), anyMap());
        }

        @Test
        void shouldReturnNotFoundWhenViewingUnknownShelter() {
            when(store.find(SHELTERS, "SH-NOPE")).thenReturn(null);

            ResponseStatusException error = assertStatus(HttpStatus.NOT_FOUND, () -> service.shelter("SH-NOPE"));
            assertEquals("Shelter was not found.", error.getReason());
        }

        @Test
        void shouldShowShelterDetailWithOnlyItsOwnHistoryAndDistributions() {
            when(store.find(SHELTERS, "SH-A")).thenReturn(shelter("SH-A", "Shelter A", "Colombo", 500, 250, true));
            when(store.list(OCCUPANCY_HISTORY)).thenReturn(List.of(
                Map.of("shelterId", "SH-A", "recordedAt", "2026-10-01T00:00:00Z"),
                Map.of("shelterId", "SH-A", "recordedAt", "2026-10-02T00:00:00Z"),
                Map.of("shelterId", "SH-B", "recordedAt", "2026-10-03T00:00:00Z")));
            when(store.list(DISTRIBUTIONS)).thenReturn(List.of(
                Map.of("shelterId", "SH-B", "createdAt", "2026-10-01T00:00:00Z")));

            Map<String, Object> view = service.shelter("SH-A");

            List<?> history = (List<?>) view.get("history");
            assertEquals(2, history.size());
            assertEquals("2026-10-02T00:00:00Z", ((Map<?, ?>) history.get(0)).get("recordedAt"), "newest first");
            assertTrue(((List<?>) view.get("distributions")).isEmpty());
            assertEquals(250L, view.get("available"));
            assertEquals(50L, view.get("occupancyRate"));
        }
    }

    // ------------------------------------------------------------------ occupancy

    @Nested
    @DisplayName("Shelter occupancy rules")
    class Occupancy {
        @BeforeEach
        void shelterWith200Of500() {
            when(tx.get(SHELTERS, "SH-A")).thenReturn(shelter("SH-A", "Shelter A", "Colombo", 500, 200, true));
        }

        @Test
        void shouldUpdateOccupancyAndReportRemainingCapacity() {
            Map<String, Object> view = service.updateOccupancy("SH-A", new OccupancyUpdateRequest(350, 200));

            assertEquals(350L, view.get("occupied"));
            assertEquals(150L, view.get("available"));
            assertEquals(70L, view.get("occupancyRate"));
            assertEquals("Active", view.get("status"));

            ArgumentCaptor<Map<String, Object>> shelterRow = rowCaptor();
            verify(tx).set(eq(SHELTERS), eq("SH-A"), shelterRow.capture());
            assertEquals(350L, shelterRow.getValue().get("occupied"));

            ArgumentCaptor<Map<String, Object>> history = rowCaptor();
            verify(tx).set(eq(OCCUPANCY_HISTORY), anyString(), history.capture());
            assertEquals("SH-A", history.getValue().get("shelterId"));
            assertEquals(200L, history.getValue().get("previousOccupied"));
            assertEquals(350L, history.getValue().get("occupied"));
            assertEquals(500L, history.getValue().get("capacity"));
            assertEquals(NOW_TEXT, history.getValue().get("recordedAt"));
        }

        @Test
        void shouldMarkShelterFullWhenOccupancyEqualsCapacity() {
            Map<String, Object> view = service.updateOccupancy("SH-A", new OccupancyUpdateRequest(500, 200));

            assertEquals(500L, view.get("occupied"));
            assertEquals(0L, view.get("available"));
            assertEquals(100L, view.get("occupancyRate"));
            assertEquals("Full", view.get("status"));
        }

        @Test
        void shouldAllowOccupancyToDropToZero() {
            Map<String, Object> view = service.updateOccupancy("SH-A", new OccupancyUpdateRequest(0, 200));
            assertEquals(0L, view.get("occupied"));
            assertEquals(500L, view.get("available"));
        }

        @Test
        void shouldRejectOccupancyWhenGreaterThanCapacity() {
            ResponseStatusException error = assertStatus(HttpStatus.CONFLICT,
                () -> service.updateOccupancy("SH-A", new OccupancyUpdateRequest(550, 200)));

            assertTrue(error.getReason().contains("550 people exceeds the capacity of 500"));
            verify(tx, never()).set(anyString(), anyString(), anyMap());
        }

        @Test
        void shouldRejectOccupancyOneAboveCapacity() {
            assertStatus(HttpStatus.CONFLICT, () -> service.updateOccupancy("SH-A", new OccupancyUpdateRequest(501, 200)));
            verify(tx, never()).set(anyString(), anyString(), anyMap());
        }

        @Test
        void shouldRejectStaleOccupancyFromAnotherOfficer() {
            ResponseStatusException error = assertStatus(HttpStatus.CONFLICT,
                () -> service.updateOccupancy("SH-A", new OccupancyUpdateRequest(300, 150)));

            assertTrue(error.getReason().contains("now 200"));
            verify(tx, never()).set(anyString(), anyString(), anyMap());
        }

        @Test
        void shouldRejectOccupancyForInactiveShelter() {
            when(tx.get(SHELTERS, "SH-X")).thenReturn(shelter("SH-X", "Closed", "Colombo", 500, 0, false));

            assertStatus(HttpStatus.CONFLICT, () -> service.updateOccupancy("SH-X", new OccupancyUpdateRequest(10, 0)));
            verify(tx, never()).set(anyString(), anyString(), anyMap());
        }

        @Test
        void shouldReturnNotFoundWhenOccupancyShelterMissing() {
            assertStatus(HttpStatus.NOT_FOUND, () -> service.updateOccupancy("SH-NOPE", new OccupancyUpdateRequest(10, 0)));
            verify(tx, never()).set(anyString(), anyString(), anyMap());
        }
    }

    // ------------------------------------------------------------------ availability / alternatives / filters

    @Nested
    @DisplayName("Shelter availability, alternatives and district filtering")
    class Availability {
        @BeforeEach
        void threeColomboSheltersAndOneInGampaha() {
            when(store.list(SHELTERS)).thenReturn(List.of(
                shelter("SH-A", "Shelter A", "Colombo", 500, 500, true),
                shelter("SH-B", "Shelter B", "Colombo", 400, 250, true),
                shelter("SH-C", "Shelter C", "Colombo", 300, 100, true),
                shelter("SH-G", "Gampaha Hall", "Gampaha", 800, 100, true)));
        }

        @Test
        void shouldReportFullShelterAsUnavailableAndOthersWithRemainingCapacity() {
            List<Map<String, Object>> colombo = service.shelters("Colombo");

            Map<String, Map<String, Object>> byId = new HashMap<>();
            colombo.forEach(row -> byId.put(String.valueOf(row.get("id")), row));
            assertEquals("Full", byId.get("SH-A").get("status"));
            assertEquals(0L, byId.get("SH-A").get("available"));
            assertEquals(150L, byId.get("SH-B").get("available"));
            assertEquals(200L, byId.get("SH-C").get("available"));

            List<Object> withSpace = colombo.stream().filter(row -> CoordinationService.num(row.get("available")) > 0)
                .map(row -> row.get("id")).toList();
            assertEquals(List.of("SH-B", "SH-C"), withSpace);
        }

        @Test
        void shouldFilterSheltersByDistrictIgnoringCase() {
            assertEquals(3, service.shelters("colombo").size());
            assertEquals(List.of("SH-G"), service.shelters("Gampaha").stream().map(row -> row.get("id")).toList());
            assertEquals(4, service.shelters(" ").size(), "blank district means all districts");
            assertEquals(4, service.shelters(null).size());
        }

        @Test
        void shouldAllowAlternativeShelterWhenSelectedShelterIsFull() {
            when(tx.get(SHELTERS, "SH-A")).thenReturn(shelter("SH-A", "Shelter A", "Colombo", 500, 500, true));
            when(tx.get(SHELTERS, "SH-B")).thenReturn(shelter("SH-B", "Shelter B", "Colombo", 400, 250, true));
            when(tx.get(RESCUE_TEAMS, "RT-1")).thenReturn(team("RT-1", "AVAILABLE"));

            ResponseStatusException full = assertStatus(HttpStatus.CONFLICT,
                () -> service.assignTeam(new AssignTeamRequest("RT-1", "SH-A", 40, "Kolonnawa", ""), "officer-1"));
            assertTrue(full.getReason().contains("can take 0 more people"));
            verify(tx, never()).set(anyString(), anyString(), anyMap());

            Map<String, Object> assignment = service.assignTeam(new AssignTeamRequest("RT-1", "SH-B", 40, "Kolonnawa", ""), "officer-1");
            assertEquals("SH-B", assignment.get("shelterId"));
            assertEquals("ASSIGNED", assignment.get("status"));
        }

        @Test
        void shouldSummariseCapacityPerDistrictInOverview() {
            when(store.list(RESOURCES)).thenReturn(List.of());

            Map<String, Object> overview = service.overview("Colombo");

            assertEquals(3, overview.get("totalShelters"));
            assertEquals(1200L, overview.get("totalCapacity"));
            assertEquals(850L, overview.get("currentOccupied"));
            assertEquals(71L, overview.get("occupancyRate"));
            assertEquals(1, ((List<?>) overview.get("byDistrict")).size());
        }
    }

    @Nested
    @DisplayName("Empty district data")
    class EmptyData {
        @Test
        void shouldReturnValidEmptyResponsesForDistrictWithNoRecords() {
            when(store.list(anyString())).thenReturn(List.of());

            assertTrue(service.shelters("Mannar").isEmpty());
            assertTrue(service.resources().isEmpty());
            assertTrue(service.listTeams("Mannar", "AVAILABLE").isEmpty());
            assertTrue(service.distributions("Mannar").isEmpty());
            assertTrue(service.listAssignments(null).isEmpty());

            Map<String, Object> overview = service.overview("Mannar");
            assertEquals(0, overview.get("totalShelters"));
            assertEquals(0L, overview.get("totalCapacity"));
            assertEquals(0L, overview.get("occupancyRate"), "no division by zero");

            Map<String, Object> alerts = service.alerts();
            assertTrue(((List<?>) alerts.get("shelterAlerts")).isEmpty());
            assertTrue(((List<?>) alerts.get("resourceAlerts")).isEmpty());
            assertTrue(((List<?>) alerts.get("teamAlerts")).isEmpty());
        }
    }

    // ------------------------------------------------------------------ rescue teams

    @Nested
    @DisplayName("Rescue team assignment")
    class Teams {
        @BeforeEach
        void shelterAndTeam() {
            when(tx.get(SHELTERS, "SH-B")).thenReturn(shelter("SH-B", "Shelter B", "Colombo", 400, 250, true));
            when(tx.get(RESCUE_TEAMS, "RT-1")).thenReturn(team("RT-1", "AVAILABLE"));
        }

        @Test
        void shouldAssignAvailableRescueTeam() {
            Map<String, Object> assignment = service.assignTeam(
                new AssignTeamRequest("RT-1", "SH-B", 40, "  Kolonnawa junction ", null), "officer-1", "Officer One");

            String id = String.valueOf(assignment.get("id"));
            assertTrue(id.startsWith("TA-"));
            assertEquals("ASSIGNED", assignment.get("status"));
            assertEquals("SH-B", assignment.get("shelterId"));
            assertEquals("Shelter B", assignment.get("shelterName"));
            assertEquals("Colombo", assignment.get("district"));
            assertEquals(40L, assignment.get("expectedEvacuees"));
            assertEquals("Kolonnawa junction", assignment.get("pickupLocation"));
            assertEquals("", assignment.get("notes"));
            assertEquals(NOW_TEXT, assignment.get("assignedAt"));

            ArgumentCaptor<Map<String, Object>> teamRow = rowCaptor();
            verify(tx).set(eq(RESCUE_TEAMS), eq("RT-1"), teamRow.capture());
            assertEquals("ASSIGNED", teamRow.getValue().get("status"));
            assertEquals(id, teamRow.getValue().get("currentAssignmentId"));
            assertEquals("officer-1", teamRow.getValue().get("updatedBy"));
            verify(tx).set(eq(TEAM_ASSIGNMENTS), eq(id), anyMap());
        }

        @Test
        void shouldAssignTeamWhenEvacueesExactlyFillShelter() {
            Map<String, Object> assignment = service.assignTeam(new AssignTeamRequest("RT-1", "SH-B", 150, "Wellawatte", ""), "officer-1");
            assertEquals(150L, assignment.get("expectedEvacuees"));
        }

        @ParameterizedTest(name = "team in status {0} is rejected")
        @ValueSource(strings = {"ASSIGNED", "DISPATCHED", "RESPONDING", "UNAVAILABLE", "COMM_FAILURE"})
        void shouldRejectAssignmentWhenTeamUnavailable(String status) {
            when(tx.get(RESCUE_TEAMS, "RT-2")).thenReturn(team("RT-2", status));

            ResponseStatusException error = assertStatus(HttpStatus.CONFLICT,
                () -> service.assignTeam(new AssignTeamRequest("RT-2", "SH-B", 10, "Wellawatte", ""), "officer-1"));

            assertTrue(error.getReason().startsWith("Team is no longer available"));
            verify(tx, never()).set(anyString(), anyString(), anyMap());
        }

        @Test
        void shouldReturnNotFoundWhenTeamMissing() {
            ResponseStatusException error = assertStatus(HttpStatus.NOT_FOUND,
                () -> service.assignTeam(new AssignTeamRequest("RT-NOPE", "SH-B", 10, "Wellawatte", ""), "officer-1"));

            assertEquals("Rescue team was not found.", error.getReason());
            verify(tx, never()).set(anyString(), anyString(), anyMap());
        }

        @Test
        void shouldRejectAssignmentWhenEvacueesExceedRemainingCapacity() {
            assertStatus(HttpStatus.CONFLICT,
                () -> service.assignTeam(new AssignTeamRequest("RT-1", "SH-B", 151, "Wellawatte", ""), "officer-1"));
            verify(tx, never()).set(anyString(), anyString(), anyMap());
        }

        @Test
        void shouldPreserveSupportTeamAgencyOnAssignment() {
            Map<String, Object> navy = team("RT-3", "AVAILABLE");
            navy.put("name", "Navy Boat Rescue Unit 4");
            navy.put("agency", "Navy");
            when(tx.get(RESCUE_TEAMS, "RT-3")).thenReturn(navy);

            Map<String, Object> assignment = service.assignTeam(
                new AssignTeamRequest("RT-1", "SH-B", 10, "Wellawatte", "", List.of("RT-3"), List.of()), "officer-1");

            Map<?, ?> summary = (Map<?, ?>) ((List<?>) assignment.get("supportTeams")).get(0);
            assertEquals("Navy", summary.get("agency"));
            assertEquals("Navy Boat Rescue Unit 4", summary.get("name"));
        }

        @Test
        void shouldFilterTeamsByDistrictAndStatus() {
            Map<String, Object> busy = team("RT-2", "DISPATCHED");
            Map<String, Object> galle = team("RT-3", "AVAILABLE");
            galle.put("district", "Galle");
            when(store.list(RESCUE_TEAMS)).thenReturn(List.of(team("RT-1", "AVAILABLE"), busy, galle));

            assertEquals(List.of("RT-1"), service.listTeams("Colombo", "available").stream().map(row -> row.get("id")).toList());
            assertEquals(3, service.listTeams(null, "").size());
        }

        @Test
        void shouldReturnNotFoundWhenViewingUnknownTeamOrAssignment() {
            assertStatus(HttpStatus.NOT_FOUND, () -> service.getTeam("RT-NOPE"));
            assertStatus(HttpStatus.NOT_FOUND, () -> service.getAssignment("TA-NOPE"));
        }
    }

    @Nested
    @DisplayName("Rescue team status tracking (in-memory store)")
    class TeamLifecycle {
        private InMemoryCoordinationStore memory;
        private CoordinationService live;

        @BeforeEach
        void seed() {
            memory = new InMemoryCoordinationStore();
            memory.transaction(write -> {
                write.set(SHELTERS, "SH-B", shelter("SH-B", "Shelter B", "Colombo", 400, 250, true));
                write.set(RESCUE_TEAMS, "RT-1", team("RT-1", "AVAILABLE"));
                return null;
            });
            live = new CoordinationService(memory, Clock.fixed(NOW, ZoneOffset.UTC));
        }

        @Test
        void shouldTrackTeamStatusThroughFullLifecycle() {
            String id = String.valueOf(live.assignTeam(new AssignTeamRequest("RT-1", "SH-B", 50, "Wellawatte", ""), "officer-1").get("id"));
            assertEquals("ASSIGNED", teamStatus());

            live.dispatch(id, "officer-1");
            assertEquals("DISPATCHED", teamStatus());

            live.markResponding(id, "officer-1");
            assertEquals("RESPONDING", teamStatus());

            Map<String, Object> result = live.recordArrival(id, new ArrivalRequest(50, 250), "officer-1");
            assertEquals("COMPLETED", ((Map<?, ?>) result.get("assignment")).get("status"));
            assertEquals(300L, result.get("occupied"));
            assertEquals(100L, result.get("available"));
            assertEquals("AVAILABLE", teamStatus(), "team is released after completion");
            assertNull(memory.find(RESCUE_TEAMS, "RT-1").get("currentAssignmentId"));
            assertEquals(4, ((List<?>) live.getAssignment(id).get("history")).size());
        }

        @Test
        void shouldRejectInvalidTransitionsAfterCompletion() {
            String id = String.valueOf(live.assignTeam(new AssignTeamRequest("RT-1", "SH-B", 10, "Wellawatte", ""), "officer-1").get("id"));
            live.dispatch(id, "officer-1");
            live.recordArrival(id, new ArrivalRequest(10, 250), "officer-1");

            assertStatus(HttpStatus.CONFLICT, () -> live.dispatch(id, "officer-1"));
            assertStatus(HttpStatus.CONFLICT, () -> live.markResponding(id, "officer-1"));
            assertStatus(HttpStatus.CONFLICT, () -> live.cancelAssignment(id, "officer-1"));
            assertStatus(HttpStatus.CONFLICT, () -> live.reportCommFailure(id, "officer-1", "Officer"));
            assertEquals("COMPLETED", live.getAssignment(id).get("status"));
        }

        @Test
        void shouldNotDoubleAssignTeamAlreadyOnAssignment() {
            live.assignTeam(new AssignTeamRequest("RT-1", "SH-B", 10, "Wellawatte", ""), "officer-1");

            assertStatus(HttpStatus.CONFLICT, () -> live.assignTeam(new AssignTeamRequest("RT-1", "SH-B", 10, "Dehiwala", ""), "officer-2"));
            assertEquals(1, memory.list(TEAM_ASSIGNMENTS).size());
        }

        private Object teamStatus() {
            return memory.find(RESCUE_TEAMS, "RT-1").get("status");
        }
    }

    // ------------------------------------------------------------------ resources

    @Nested
    @DisplayName("Relief resource stock")
    class Resources {
        @Test
        void shouldReturnAvailableQuantityAndStockStatus() {
            when(store.list(RESOURCES)).thenReturn(List.of(
                resource("RS-1", "Water", 1000, 1000, 100),
                resource("RS-2", "Blankets", 50, 500, 100),
                resource("RS-3", "Tents", 0, 40, 5)));

            List<Map<String, Object>> rows = service.resources();

            assertEquals(1000L, rows.get(0).get("available"));
            assertEquals("Available", rows.get(0).get("status"));
            assertEquals("Low Stock", rows.get(1).get("status"));
            assertEquals("Out of Stock", rows.get(2).get("status"));
        }

        @Test
        void shouldTreatStockEqualToThresholdAsLow() {
            assertEquals("Low Stock", CoordinationService.resourceView(resource("RS-1", "Water", 100, 1000, 100)).get("status"));
        }

        @Test
        void shouldCreateResourceWithStockLevels() {
            Map<String, Object> view = service.createResource(new ResourceRequest(" Water ", "Food & Water", " Litre ", 1000, 1000, 100));

            ArgumentCaptor<Map<String, Object>> saved = rowCaptor();
            verify(tx).set(eq(RESOURCES), anyString(), saved.capture());
            assertEquals("Water", saved.getValue().get("name"));
            assertEquals("Litre", saved.getValue().get("unit"));
            assertEquals(1000L, saved.getValue().get("totalQuantity"));
            assertEquals(1000L, saved.getValue().get("available"));
            assertEquals("Available", view.get("status"));
        }

        @Test
        void shouldRejectResourceWhenAvailableExceedsTotal() {
            assertStatus(HttpStatus.BAD_REQUEST, () -> service.createResource(new ResourceRequest("Water", "Food & Water", "Litre", 100, 101, 10)));
            assertStatus(HttpStatus.BAD_REQUEST, () -> service.updateResource("RS-1", new ResourceRequest("Water", "Food & Water", "Litre", 100, 101, 10)));
            verify(store, never()).transaction(any());
        }

        @Test
        void shouldUpdateExistingResourceStock() {
            when(tx.get(RESOURCES, "RS-1")).thenReturn(resource("RS-1", "Water", 1000, 1000, 100));

            Map<String, Object> view = service.updateResource("RS-1", new ResourceRequest("Water", "Food & Water", "Litre", 1500, 1200, 100));

            assertEquals(1200L, view.get("available"));
            verify(tx).set(eq(RESOURCES), eq("RS-1"), anyMap());
        }

        @Test
        void shouldReturnNotFoundWhenUpdatingUnknownResource() {
            assertStatus(HttpStatus.NOT_FOUND, () -> service.updateResource("RS-NOPE", new ResourceRequest("Water", "Food & Water", "Litre", 10, 10, 1)));
            verify(tx, never()).set(anyString(), anyString(), anyMap());
        }
    }

    // ------------------------------------------------------------------ allocation / distribution

    @Nested
    @DisplayName("Resource allocation and distribution records")
    class Allocation {
        @BeforeEach
        void shelterA() {
            when(tx.get(SHELTERS, "SH-A")).thenReturn(shelter("SH-A", "Shelter A", "Colombo", 500, 200, true));
        }

        @Test
        void shouldAllocateResourceWhenStockAvailable() {
            when(tx.get(RESOURCES, "RS-W")).thenReturn(resource("RS-W", "Water", 1000, 1000, 100));

            Map<String, Object> distribution = service.allocate(allocation("SH-A", 0, item("RS-W", 300)));

            ArgumentCaptor<Map<String, Object>> stock = rowCaptor();
            verify(tx).set(eq(RESOURCES), eq("RS-W"), stock.capture());
            assertEquals(700L, stock.getValue().get("available"), "remaining stock");
            assertEquals(1000L, stock.getValue().get("totalQuantity"), "total quantity is unchanged");
            assertEquals(NOW_TEXT, stock.getValue().get("updatedAt"));

            verify(tx).set(eq(DISTRIBUTIONS), eq(String.valueOf(distribution.get("id"))), anyMap());
            assertEquals("PENDING", distribution.get("status"));
        }

        @Test
        void shouldRecordFullDistributionDetails() {
            when(tx.get(RESOURCES, "RS-W")).thenReturn(resource("RS-W", "Water", 1000, 1000, 100));
            LocalDate date = LocalDate.of(2026, 10, 10);

            Map<String, Object> distribution = service.allocate(
                new DistributionRequest(List.of(item("RS-W", 250)), "SH-A", date, "Military Transport", "  Urgent  ", 40));

            assertTrue(String.valueOf(distribution.get("id")).startsWith("RD-"));
            assertEquals("SH-A", distribution.get("shelterId"));
            assertEquals("Shelter A", distribution.get("shelterName"));
            assertEquals("Colombo", distribution.get("district"));
            assertEquals("2026-10-10", distribution.get("distributionDate"));
            assertEquals("Military Transport", distribution.get("transportMethod"));
            assertEquals("Urgent", distribution.get("notes"));
            assertEquals(40L, distribution.get("expectedPeople"));
            assertEquals(NOW_TEXT, distribution.get("createdAt"));
            Map<?, ?> line = (Map<?, ?>) ((List<?>) distribution.get("items")).get(0);
            assertEquals("RS-W", line.get("resourceId"));
            assertEquals("Water", line.get("name"));
            assertEquals("Litre", line.get("unit"));
            assertEquals(250L, line.get("quantity"));
        }

        @Test
        void shouldUpdateStockAfterDistribution() {
            when(tx.get(RESOURCES, "RS-W")).thenReturn(resource("RS-W", "Water", 1000, 1000, 100));

            service.allocate(allocation("SH-A", 0, item("RS-W", 250)));

            ArgumentCaptor<Map<String, Object>> stock = rowCaptor();
            verify(tx).set(eq(RESOURCES), eq("RS-W"), stock.capture());
            assertEquals(750L, stock.getValue().get("available"));
        }

        @Test
        void shouldAllowAllocationEqualToAvailableStock() {
            when(tx.get(RESOURCES, "RS-W")).thenReturn(resource("RS-W", "Water", 500, 1000, 100));

            service.allocate(allocation("SH-A", 0, item("RS-W", 500)));

            ArgumentCaptor<Map<String, Object>> stock = rowCaptor();
            verify(tx).set(eq(RESOURCES), eq("RS-W"), stock.capture());
            assertEquals(0L, stock.getValue().get("available"));
            assertEquals("Out of Stock", CoordinationService.resourceView(stock.getValue()).get("status"));
        }

        @Test
        void shouldRejectAllocationWhenRequestedQuantityExceedsStock() {
            when(tx.get(RESOURCES, "RS-W")).thenReturn(resource("RS-W", "Water", 200, 1000, 100));

            ResponseStatusException error = assertStatus(HttpStatus.CONFLICT,
                () -> service.allocate(allocation("SH-A", 0, item("RS-W", 300))));

            assertEquals("Insufficient stock for Water: requested 300, available 200.", error.getReason());
            verify(tx, never()).set(anyString(), anyString(), anyMap());
        }

        @Test
        void shouldMergeDuplicateLinesBeforeCheckingStock() {
            when(tx.get(RESOURCES, "RS-W")).thenReturn(resource("RS-W", "Water", 200, 1000, 100));

            ResponseStatusException error = assertStatus(HttpStatus.CONFLICT,
                () -> service.allocate(allocation("SH-A", 0, item("RS-W", 150), item("RS-W", 100))));

            assertTrue(error.getReason().contains("requested 250"));
            verify(tx, never()).set(anyString(), anyString(), anyMap());
        }

        @Test
        void shouldRejectWholeAllocationWhenAnyLineIsShort() {
            when(tx.get(RESOURCES, "RS-W")).thenReturn(resource("RS-W", "Water", 1000, 1000, 100));
            when(tx.get(RESOURCES, "RS-M")).thenReturn(resource("RS-M", "Medical Kits", 10, 100, 5));

            assertStatus(HttpStatus.CONFLICT, () -> service.allocate(allocation("SH-A", 0, item("RS-W", 300), item("RS-M", 11))));
            verify(tx, never()).set(anyString(), anyString(), anyMap());
        }

        @Test
        void shouldAllowAllocationFromAlternativeStockWhenFirstSourceIsShort() {
            // Production has no automatic source selection; the officer picks another stock record and retries.
            when(tx.get(RESOURCES, "RS-W1")).thenReturn(resource("RS-W1", "Water (Depot 1)", 100, 100, 10));
            when(tx.get(RESOURCES, "RS-W2")).thenReturn(resource("RS-W2", "Water (Depot 2)", 500, 500, 10));

            assertStatus(HttpStatus.CONFLICT, () -> service.allocate(allocation("SH-A", 0, item("RS-W1", 300))));
            Map<String, Object> distribution = service.allocate(allocation("SH-A", 0, item("RS-W2", 300)));

            ArgumentCaptor<Map<String, Object>> stock = rowCaptor();
            verify(tx).set(eq(RESOURCES), eq("RS-W2"), stock.capture());
            assertEquals(200L, stock.getValue().get("available"));
            verify(tx, never()).set(eq(RESOURCES), eq("RS-W1"), anyMap());
            assertEquals("RS-W2", ((Map<?, ?>) ((List<?>) distribution.get("items")).get(0)).get("resourceId"));
        }

        @Test
        void shouldReturnNotFoundWhenResourceMissing() {
            assertStatus(HttpStatus.NOT_FOUND, () -> service.allocate(allocation("SH-A", 0, item("RS-NOPE", 1))));
            verify(tx, never()).set(anyString(), anyString(), anyMap());
        }

        @Test
        void shouldReturnNotFoundWhenDestinationShelterMissing() {
            assertStatus(HttpStatus.NOT_FOUND, () -> service.allocate(allocation("SH-NOPE", 0, item("RS-W", 1))));
            verify(tx, never()).set(anyString(), anyString(), anyMap());
        }

        @Test
        void shouldRejectAllocationWhenExpectedPeopleExceedShelterSpace() {
            when(tx.get(RESOURCES, "RS-W")).thenReturn(resource("RS-W", "Water", 1000, 1000, 100));

            assertStatus(HttpStatus.CONFLICT, () -> service.allocate(allocation("SH-A", 301, item("RS-W", 10))));
            verify(tx, never()).set(anyString(), anyString(), anyMap());
        }

        @Test
        void shouldFilterDistributionHistoryByDistrictNewestFirst() {
            when(store.list(DISTRIBUTIONS)).thenReturn(List.of(
                Map.of("id", "RD-1", "district", "Colombo", "createdAt", "2026-10-01T00:00:00Z"),
                Map.of("id", "RD-2", "district", "Gampaha", "createdAt", "2026-10-02T00:00:00Z"),
                Map.of("id", "RD-3", "district", "Colombo", "createdAt", "2026-10-03T00:00:00Z")));

            assertEquals(List.of("RD-3", "RD-1"), service.distributions("Colombo").stream().map(row -> row.get("id")).toList());
            assertEquals(3, service.distributions(null).size());
        }
    }

    @Nested
    @DisplayName("Distribution status transitions")
    class DistributionStatus {
        private Map<String, Object> pending;

        @BeforeEach
        void pendingDistribution() {
            pending = new LinkedHashMap<>(Map.of("id", "RD-1", "status", "PENDING",
                "items", List.of(Map.of("resourceId", "RS-W", "quantity", 300L))));
            when(tx.get(DISTRIBUTIONS, "RD-1")).thenReturn(pending);
        }

        @Test
        void shouldMoveDistributionToInTransit() {
            Map<String, Object> row = service.updateDistributionStatus("RD-1", new DistributionStatusRequest("IN_TRANSIT"));
            assertEquals("IN_TRANSIT", row.get("status"));
            assertEquals(NOW_TEXT, row.get("updatedAt"));
            verify(tx, never()).set(eq(RESOURCES), anyString(), anyMap());
        }

        @Test
        void shouldReturnStockWhenDistributionCancelled() {
            when(tx.get(RESOURCES, "RS-W")).thenReturn(resource("RS-W", "Water", 700, 1000, 100));

            service.updateDistributionStatus("RD-1", new DistributionStatusRequest("CANCELLED"));

            ArgumentCaptor<Map<String, Object>> stock = rowCaptor();
            verify(tx).set(eq(RESOURCES), eq("RS-W"), stock.capture());
            assertEquals(1000L, stock.getValue().get("available"));
        }

        @Test
        void shouldIgnoreMissingResourceWhenCancelling() {
            Map<String, Object> row = service.updateDistributionStatus("RD-1", new DistributionStatusRequest("CANCELLED"));
            assertEquals("CANCELLED", row.get("status"));
            verify(tx, never()).set(eq(RESOURCES), anyString(), anyMap());
        }

        @Test
        void shouldNotWriteWhenStatusUnchanged() {
            pending.put("status", "IN_TRANSIT");
            service.updateDistributionStatus("RD-1", new DistributionStatusRequest("IN_TRANSIT"));
            verify(tx, never()).set(anyString(), anyString(), anyMap());
        }

        @ParameterizedTest(name = "{0} distribution cannot change")
        @ValueSource(strings = {"COMPLETED", "CANCELLED"})
        void shouldRejectChangesToFinishedDistribution(String finished) {
            pending.put("status", finished);
            assertStatus(HttpStatus.CONFLICT, () -> service.updateDistributionStatus("RD-1", new DistributionStatusRequest("IN_TRANSIT")));
            verify(tx, never()).set(anyString(), anyString(), anyMap());
        }

        @Test
        void shouldReturnNotFoundForUnknownDistribution() {
            assertStatus(HttpStatus.NOT_FOUND, () -> service.updateDistributionStatus("RD-NOPE", new DistributionStatusRequest("COMPLETED")));
        }
    }

    // ------------------------------------------------------------------ ownership

    @Nested
    @DisplayName("Organization ownership")
    class Ownership {
        @Test
        void shouldPreserveShelterManagingOrganizationWhenOccupancyChanges() {
            Map<String, Object> row = shelter("SH-A", "Shelter A", "Colombo", 500, 200, true);
            row.put("managingOrganization", "Sri Lanka Army");
            when(tx.get(SHELTERS, "SH-A")).thenReturn(row);

            service.updateOccupancy("SH-A", new OccupancyUpdateRequest(300, 200));

            ArgumentCaptor<Map<String, Object>> saved = rowCaptor();
            verify(tx).set(eq(SHELTERS), eq("SH-A"), saved.capture());
            assertEquals("Sri Lanka Army", saved.getValue().get("managingOrganization"));
        }

        @Test
        void shouldKeepTeamsFromDifferentAgenciesIdentifiable() {
            List<Map<String, Object>> teams = new ArrayList<>();
            String[][] agencies = {{"RT-1", "DMC"}, {"RT-2", "Sri Lanka Army"}, {"RT-3", "Red Cross"}, {"RT-4", "NGO"}};
            for (String[] entry : agencies) {
                Map<String, Object> row = team(entry[0], "AVAILABLE");
                row.put("agency", entry[1]);
                teams.add(row);
            }
            when(store.list(RESCUE_TEAMS)).thenReturn(teams);

            List<Object> listed = service.listTeams("Colombo", null).stream().map(row -> row.get("agency")).toList();

            assertEquals(List.of("DMC", "Sri Lanka Army", "Red Cross", "NGO"), listed);
        }

        @Test
        void shouldPreserveUnrelatedResourceFieldsDuringDistribution() {
            // Resources have no organization field in production; any extra stored attribute must survive allocation.
            Map<String, Object> water = resource("RS-W", "Water", 1000, 1000, 100);
            water.put("category", "Food & Water");
            when(tx.get(SHELTERS, "SH-A")).thenReturn(shelter("SH-A", "Shelter A", "Colombo", 500, 0, true));
            when(tx.get(RESOURCES, "RS-W")).thenReturn(water);

            service.allocate(allocation("SH-A", 0, item("RS-W", 100)));

            ArgumentCaptor<Map<String, Object>> saved = rowCaptor();
            verify(tx).set(eq(RESOURCES), eq("RS-W"), saved.capture());
            assertEquals("Food & Water", saved.getValue().get("category"));
            assertEquals("Water", saved.getValue().get("name"));
            assertEquals("Litre", saved.getValue().get("unit"));
        }
    }

    // ------------------------------------------------------------------ failures

    @Nested
    @DisplayName("Repository failures are never confirmed")
    class Failures {
        private final ResponseStatusException outage =
            new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Unable to access shelter and resource records. Please try again.");

        @Test
        void shouldNotConfirmUpdateWhenRepositoryFails() {
            doThrow(outage).when(store).transaction(any());

            assertSame(outage, assertThrows(ResponseStatusException.class,
                () -> service.updateOccupancy("SH-A", new OccupancyUpdateRequest(300, 200))));
            assertStatus(HttpStatus.SERVICE_UNAVAILABLE,
                () -> service.assignTeam(new AssignTeamRequest("RT-1", "SH-A", 10, "Wellawatte", ""), "officer-1"));
            assertStatus(HttpStatus.SERVICE_UNAVAILABLE, () -> service.allocate(allocation("SH-A", 0, item("RS-W", 1))));
            assertStatus(HttpStatus.SERVICE_UNAVAILABLE, () -> service.createShelter(shelterRequest("A", "Colombo", 10, true)));
        }

        @Test
        void shouldPropagateReadFailureWhenListingShelters() {
            when(store.list(SHELTERS)).thenThrow(outage);
            assertStatus(HttpStatus.SERVICE_UNAVAILABLE, () -> service.shelters("Colombo"));
        }

        @Test
        void shouldKeepLastValidOccupancyWhenHistoryWriteFails() {
            InMemoryCoordinationStore memory = seededMemory();
            CoordinationService failing = new CoordinationService(failOn(memory, OCCUPANCY_HISTORY), Clock.fixed(NOW, ZoneOffset.UTC));

            assertStatus(HttpStatus.SERVICE_UNAVAILABLE, () -> failing.updateOccupancy("SH-A", new OccupancyUpdateRequest(300, 200)));

            assertEquals(200L, memory.find(SHELTERS, "SH-A").get("occupied"));
            assertTrue(memory.list(OCCUPANCY_HISTORY).isEmpty());
        }

        @Test
        void shouldNotReduceStockWhenDistributionSaveFails() {
            InMemoryCoordinationStore memory = seededMemory();
            CoordinationService failing = new CoordinationService(failOn(memory, DISTRIBUTIONS), Clock.fixed(NOW, ZoneOffset.UTC));

            assertStatus(HttpStatus.SERVICE_UNAVAILABLE, () -> failing.allocate(allocation("SH-A", 0, item("RS-W", 300))));

            assertEquals(1000L, memory.find(RESOURCES, "RS-W").get("available"), "stock write is rolled back with the failed distribution");
            assertTrue(memory.list(DISTRIBUTIONS).isEmpty());
        }

        @Test
        void shouldNotLeaveTeamAssignedWhenAssignmentSaveFails() {
            InMemoryCoordinationStore memory = seededMemory();
            CoordinationService failing = new CoordinationService(failOn(memory, TEAM_ASSIGNMENTS), Clock.fixed(NOW, ZoneOffset.UTC));

            assertStatus(HttpStatus.SERVICE_UNAVAILABLE,
                () -> failing.assignTeam(new AssignTeamRequest("RT-1", "SH-A", 10, "Wellawatte", ""), "officer-1"));

            assertEquals("AVAILABLE", memory.find(RESCUE_TEAMS, "RT-1").get("status"));
            assertNull(memory.find(RESCUE_TEAMS, "RT-1").get("currentAssignmentId"));
            assertTrue(memory.list(TEAM_ASSIGNMENTS).isEmpty());
        }

        @Test
        void shouldSucceedOnRetryAfterTransientFailure() {
            InMemoryCoordinationStore memory = seededMemory();
            CoordinationService failing = new CoordinationService(failOn(memory, DISTRIBUTIONS), Clock.fixed(NOW, ZoneOffset.UTC));
            assertStatus(HttpStatus.SERVICE_UNAVAILABLE, () -> failing.allocate(allocation("SH-A", 0, item("RS-W", 300))));

            new CoordinationService(memory, Clock.fixed(NOW, ZoneOffset.UTC)).allocate(allocation("SH-A", 0, item("RS-W", 300)));

            assertEquals(700L, memory.find(RESOURCES, "RS-W").get("available"), "stock is reduced exactly once");
            assertEquals(1, memory.list(DISTRIBUTIONS).size());
        }

        private InMemoryCoordinationStore seededMemory() {
            InMemoryCoordinationStore memory = new InMemoryCoordinationStore();
            memory.transaction(write -> {
                write.set(SHELTERS, "SH-A", shelter("SH-A", "Shelter A", "Colombo", 500, 200, true));
                write.set(RESOURCES, "RS-W", resource("RS-W", "Water", 1000, 1000, 100));
                write.set(RESCUE_TEAMS, "RT-1", team("RT-1", "AVAILABLE"));
                return null;
            });
            return memory;
        }

        /** Delegates to the real store but fails every write to one collection, like a Firestore write error mid-transaction. */
        private CoordinationStore failOn(CoordinationStore delegate, String failingCollection) {
            return new CoordinationStore() {
                public List<Map<String, Object>> list(String collection) {
                    return delegate.list(collection);
                }
                public Map<String, Object> find(String collection, String id) {
                    return delegate.find(collection, id);
                }
                public <T> T transaction(Function<Tx, T> work) {
                    return delegate.transaction(inner -> work.apply(new Tx() {
                        public Map<String, Object> get(String collection, String id) {
                            return inner.get(collection, id);
                        }
                        public void set(String collection, String id, Map<String, Object> data) {
                            if (failingCollection.equals(collection)) throw outage;
                            inner.set(collection, id, data);
                        }
                    }));
                }
            };
        }
    }

    // ------------------------------------------------------------------ fixtures

    private static ShelterRequest shelterRequest(String name, String district, int capacity, boolean active) {
        return new ShelterRequest(name, district, "Galle Road, Colombo 03", "Community Hall", "Sri Lanka Red Cross",
            "Mr. P. Silva", "011 234 5678", capacity, active, List.of("Toilets", "Clean Water"));
    }

    private static Map<String, Object> shelter(String id, String name, String district, long capacity, long occupied, boolean active) {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("id", id);
        row.put("name", name);
        row.put("district", district);
        row.put("capacity", capacity);
        row.put("occupied", occupied);
        row.put("active", active);
        row.put("managingOrganization", "DMC");
        row.put("updatedAt", "2026-10-01T00:00:00Z");
        return row;
    }

    private static Map<String, Object> resource(String id, String name, long available, long total, long threshold) {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("id", id);
        row.put("name", name);
        row.put("category", "Food & Water");
        row.put("unit", "Litre");
        row.put("totalQuantity", total);
        row.put("available", available);
        row.put("lowStockThreshold", threshold);
        return row;
    }

    private static Map<String, Object> team(String id, String status) {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("id", id);
        row.put("name", "Team " + id);
        row.put("agency", "DMC");
        row.put("district", "Colombo");
        row.put("memberCount", 6L);
        row.put("status", status);
        row.put("currentAssignmentId", null);
        return row;
    }

    private static DistributionRequest allocation(String shelterId, int expectedPeople, DistributionRequest.Item... items) {
        return new DistributionRequest(List.of(items), shelterId, LocalDate.of(2026, 10, 10), "DMC Vehicle", "", expectedPeople);
    }

    private static DistributionRequest.Item item(String resourceId, int quantity) {
        return new DistributionRequest.Item(resourceId, quantity);
    }

    @SuppressWarnings({"unchecked", "rawtypes"})
    private static ArgumentCaptor<Map<String, Object>> rowCaptor() {
        return (ArgumentCaptor) ArgumentCaptor.forClass(Map.class);
    }

    private static ResponseStatusException assertStatus(HttpStatus status, Executable action) {
        ResponseStatusException error = assertThrows(ResponseStatusException.class, action);
        assertEquals(status, error.getStatusCode());
        return error;
    }
}
