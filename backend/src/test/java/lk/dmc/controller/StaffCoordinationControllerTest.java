package lk.dmc.controller;

import java.util.List;
import java.util.Map;
import lk.dmc.dto.*;
import lk.dmc.repository.PublicProfileRepository;
import lk.dmc.security.FirebaseIdentityService;
import lk.dmc.security.PublicIdentity;
import lk.dmc.service.CoordinationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.server.ResponseStatusException;
import static org.hamcrest.Matchers.containsString;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/** UC2 REST layer: routes, request validation, error mapping and role access. The service is mocked. */
@SpringBootTest(properties = "app.firebase.enabled=false")
@AutoConfigureMockMvc
@DisplayName("UC2 StaffCoordinationController")
class StaffCoordinationControllerTest {
    private static final String BASE = "/api/staff/resources-shelters";
    private static final String OFFICER = "Bearer district-officer-token";

    @Autowired MockMvc mvc;
    @MockitoBean CoordinationService service;
    @MockitoBean FirebaseIdentityService identities;
    @MockitoBean com.cloudinary.Cloudinary cloudinary;
    @MockitoBean PublicProfileRepository profiles;

    @BeforeEach
    void identities() {
        when(identities.verify("district-officer-token"))
            .thenReturn(new PublicIdentity("officer-1", "officer@dmc.lk", "District Officer", "DISTRICT_OFFICER"));
        when(identities.verify("dmc-officer-token"))
            .thenReturn(new PublicIdentity("officer-2", "dmc@dmc.lk", "", "DMC_OFFICER"));
        when(identities.verify("team-member-token"))
            .thenReturn(new PublicIdentity("member-1", "member@dmc.lk", "Member", "RESPONSE_TEAM_MEMBER"));
        when(identities.verify("volunteer-token"))
            .thenReturn(new PublicIdentity("vol-1", "vol@example.com", "Volunteer", "COMMUNITY_VOLUNTEER"));
    }

    // ---- shelters

    @Test
    void shouldRegisterShelterAndReturnCreated() throws Exception {
        when(service.createShelter(any())).thenReturn(Map.of("id", "SH-1", "capacity", 500, "occupied", 0, "status", "Active"));

        mvc.perform(post(BASE + "/shelters").header("Authorization", OFFICER).contentType(MediaType.APPLICATION_JSON)
                .content(shelterJson(500)))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.id").value("SH-1"))
            .andExpect(jsonPath("$.status").value("Active"));

        ArgumentCaptor<ShelterRequest> sent = ArgumentCaptor.forClass(ShelterRequest.class);
        verify(service).createShelter(sent.capture());
        assertEquals("Colombo Central Emergency Shelter", sent.getValue().name());
        assertEquals("Colombo", sent.getValue().district());
        assertEquals(500, sent.getValue().capacity());
        assertEquals("Sri Lanka Red Cross", sent.getValue().managingOrganization());
    }

    @ParameterizedTest(name = "capacity {0} is rejected")
    @ValueSource(ints = {0, -1, 100001})
    void shouldRejectShelterWithInvalidCapacity(int capacity) throws Exception {
        mvc.perform(post(BASE + "/shelters").header("Authorization", OFFICER).contentType(MediaType.APPLICATION_JSON)
                .content(shelterJson(capacity)))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.errors.capacity").exists());

        verify(service, never()).createShelter(any());
    }

    @Test
    void shouldRejectShelterWithMissingRequiredFields() throws Exception {
        mvc.perform(post(BASE + "/shelters").header("Authorization", OFFICER).contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"\",\"capacity\":100,\"active\":true,\"contactNumber\":\"abc\"}"))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.errors.name").exists())
            .andExpect(jsonPath("$.errors.district").exists())
            .andExpect(jsonPath("$.errors.contactNumber").exists());
        verify(service, never()).createShelter(any());
    }

    @Test
    void shouldListSheltersForRequestedDistrict() throws Exception {
        when(service.shelters("Colombo")).thenReturn(List.of(Map.of("id", "SH-1", "available", 150)));

        mvc.perform(get(BASE + "/shelters").param("district", "Colombo").header("Authorization", OFFICER))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$[0].available").value(150));
        verify(service).shelters("Colombo");
    }

    @Test
    void shouldReturnEmptyListForDistrictWithoutShelters() throws Exception {
        when(service.shelters("Mannar")).thenReturn(List.of());

        mvc.perform(get(BASE + "/shelters").param("district", "Mannar").header("Authorization", OFFICER))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.length()").value(0));
    }

    @Test
    void shouldReturnNotFoundForUnknownShelter() throws Exception {
        when(service.shelter("SH-NOPE")).thenThrow(new ResponseStatusException(HttpStatus.NOT_FOUND, "Shelter was not found."));

        mvc.perform(get(BASE + "/shelters/SH-NOPE").header("Authorization", OFFICER))
            .andExpect(status().isNotFound())
            .andExpect(jsonPath("$.message").value("Shelter was not found."));
    }

    @Test
    void shouldUpdateShelterDetails() throws Exception {
        when(service.updateShelter(eq("SH-1"), any())).thenReturn(Map.of("id", "SH-1", "capacity", 600));

        mvc.perform(put(BASE + "/shelters/SH-1").header("Authorization", OFFICER).contentType(MediaType.APPLICATION_JSON)
                .content(shelterJson(600)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.capacity").value(600));
    }

    // ---- occupancy

    @Test
    void shouldUpdateOccupancy() throws Exception {
        when(service.updateOccupancy(eq("SH-1"), any())).thenReturn(Map.of("occupied", 350, "available", 150));

        mvc.perform(patch(BASE + "/shelters/SH-1/occupancy").header("Authorization", OFFICER).contentType(MediaType.APPLICATION_JSON)
                .content("{\"occupied\":350,\"expectedOccupancy\":200}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.available").value(150));
        verify(service).updateOccupancy("SH-1", new OccupancyUpdateRequest(350, 200));
    }

    @Test
    void shouldReturnConflictWhenOccupancyExceedsCapacity() throws Exception {
        when(service.updateOccupancy(eq("SH-1"), any())).thenThrow(new ResponseStatusException(HttpStatus.CONFLICT,
            "Insufficient shelter capacity: 550 people exceeds the capacity of 500."));

        mvc.perform(patch(BASE + "/shelters/SH-1/occupancy").header("Authorization", OFFICER).contentType(MediaType.APPLICATION_JSON)
                .content("{\"occupied\":550,\"expectedOccupancy\":200}"))
            .andExpect(status().isConflict())
            .andExpect(jsonPath("$.message").value(containsString("exceeds the capacity of 500")));
    }

    @Test
    void shouldRejectNegativeOccupancyBeforeReachingService() throws Exception {
        mvc.perform(patch(BASE + "/shelters/SH-1/occupancy").header("Authorization", OFFICER).contentType(MediaType.APPLICATION_JSON)
                .content("{\"occupied\":-1,\"expectedOccupancy\":200}"))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.errors.occupied").exists());
        verify(service, never()).updateOccupancy(anyString(), any());
    }

    @Test
    void shouldReturnServiceUnavailableWhenOccupancyCannotBeSaved() throws Exception {
        when(service.updateOccupancy(eq("SH-1"), any())).thenThrow(new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
            "Unable to access shelter and resource records. Please try again."));

        mvc.perform(patch(BASE + "/shelters/SH-1/occupancy").header("Authorization", OFFICER).contentType(MediaType.APPLICATION_JSON)
                .content("{\"occupied\":300,\"expectedOccupancy\":200}"))
            .andExpect(status().isServiceUnavailable())
            .andExpect(jsonPath("$.message").value(containsString("Please try again")));
    }

    @Test
    void shouldHideUnexpectedErrorsBehindGenericServiceUnavailable() throws Exception {
        when(service.overview(null)).thenThrow(new IllegalStateException("boom"));

        mvc.perform(get(BASE + "/overview").header("Authorization", OFFICER))
            .andExpect(status().isServiceUnavailable())
            .andExpect(jsonPath("$.message").value("The service is temporarily unavailable. Please try again."));
    }

    // ---- resources and distributions

    @Test
    void shouldListResources() throws Exception {
        when(service.resources()).thenReturn(List.of(Map.of("id", "RS-W", "name", "Water", "available", 1000)));

        mvc.perform(get(BASE + "/resources").header("Authorization", OFFICER))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$[0].available").value(1000));
    }

    @Test
    void shouldCreateAndUpdateResource() throws Exception {
        String body = "{\"name\":\"Water\",\"category\":\"Food & Water\",\"unit\":\"Litre\",\"totalQuantity\":1000,\"available\":1000,\"lowStockThreshold\":100}";
        when(service.createResource(any())).thenReturn(Map.of("id", "RS-W"));
        when(service.updateResource(eq("RS-W"), any())).thenReturn(Map.of("id", "RS-W"));

        mvc.perform(post(BASE + "/resources").header("Authorization", OFFICER).contentType(MediaType.APPLICATION_JSON).content(body))
            .andExpect(status().isCreated());
        mvc.perform(put(BASE + "/resources/RS-W").header("Authorization", OFFICER).contentType(MediaType.APPLICATION_JSON).content(body))
            .andExpect(status().isOk());
        verify(service).createResource(new ResourceRequest("Water", "Food & Water", "Litre", 1000, 1000, 100));
    }

    @Test
    void shouldRejectResourceWithUnknownCategoryOrNegativeStock() throws Exception {
        mvc.perform(post(BASE + "/resources").header("Authorization", OFFICER).contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"Water\",\"category\":\"Toys\",\"unit\":\"Litre\",\"totalQuantity\":-1,\"available\":0,\"lowStockThreshold\":0}"))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.errors.category").exists())
            .andExpect(jsonPath("$.errors.totalQuantity").exists());
        verify(service, never()).createResource(any());
    }

    @Test
    void shouldAllocateResourceToShelter() throws Exception {
        when(service.allocate(any())).thenReturn(Map.of("id", "RD-1", "status", "PENDING", "shelterId", "SH-1"));

        mvc.perform(post(BASE + "/distributions").header("Authorization", OFFICER).contentType(MediaType.APPLICATION_JSON)
                .content(allocationJson(300, "2099-01-01")))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.status").value("PENDING"));

        ArgumentCaptor<DistributionRequest> sent = ArgumentCaptor.forClass(DistributionRequest.class);
        verify(service).allocate(sent.capture());
        assertEquals("SH-1", sent.getValue().shelterId());
        assertEquals(300, sent.getValue().items().get(0).quantity());
    }

    @ParameterizedTest(name = "allocation quantity {0} is rejected")
    @ValueSource(ints = {0, -5})
    void shouldRejectZeroOrNegativeAllocation(int quantity) throws Exception {
        mvc.perform(post(BASE + "/distributions").header("Authorization", OFFICER).contentType(MediaType.APPLICATION_JSON)
                .content(allocationJson(quantity, "2099-01-01")))
            .andExpect(status().isBadRequest());
        verify(service, never()).allocate(any());
    }

    @Test
    void shouldRejectAllocationWithPastDateOrNoItems() throws Exception {
        mvc.perform(post(BASE + "/distributions").header("Authorization", OFFICER).contentType(MediaType.APPLICATION_JSON)
                .content(allocationJson(10, "2000-01-01")))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.errors.distributionDate").exists());
        mvc.perform(post(BASE + "/distributions").header("Authorization", OFFICER).contentType(MediaType.APPLICATION_JSON)
                .content("{\"items\":[],\"shelterId\":\"SH-1\",\"distributionDate\":\"2099-01-01\",\"transportMethod\":\"Rocket\"}"))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.errors.items").exists())
            .andExpect(jsonPath("$.errors.transportMethod").exists());
        verify(service, never()).allocate(any());
    }

    @Test
    void shouldReturnConflictWhenStockIsInsufficient() throws Exception {
        when(service.allocate(any())).thenThrow(new ResponseStatusException(HttpStatus.CONFLICT,
            "Insufficient stock for Water: requested 300, available 200."));

        mvc.perform(post(BASE + "/distributions").header("Authorization", OFFICER).contentType(MediaType.APPLICATION_JSON)
                .content(allocationJson(300, "2099-01-01")))
            .andExpect(status().isConflict())
            .andExpect(jsonPath("$.message").value("Insufficient stock for Water: requested 300, available 200."));
    }

    @Test
    void shouldReturnServiceUnavailableWhenAllocationCannotBeSaved() throws Exception {
        when(service.allocate(any())).thenThrow(new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Unable to access shelter and resource records. Please try again."));

        mvc.perform(post(BASE + "/distributions").header("Authorization", OFFICER).contentType(MediaType.APPLICATION_JSON)
                .content(allocationJson(300, "2099-01-01")))
            .andExpect(status().isServiceUnavailable())
            .andExpect(jsonPath("$.id").doesNotExist());
    }

    @Test
    void shouldListDistributionHistoryForDistrict() throws Exception {
        when(service.distributions("Colombo")).thenReturn(List.of(Map.of("id", "RD-1", "district", "Colombo")));

        mvc.perform(get(BASE + "/distributions").param("district", "Colombo").header("Authorization", OFFICER))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$[0].id").value("RD-1"));
    }

    @Test
    void shouldUpdateDistributionStatusAndRejectUnknownStatus() throws Exception {
        when(service.updateDistributionStatus(eq("RD-1"), any())).thenReturn(Map.of("status", "IN_TRANSIT"));

        mvc.perform(patch(BASE + "/distributions/RD-1/status").header("Authorization", OFFICER).contentType(MediaType.APPLICATION_JSON)
                .content("{\"status\":\"IN_TRANSIT\"}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.status").value("IN_TRANSIT"));
        mvc.perform(patch(BASE + "/distributions/RD-1/status").header("Authorization", OFFICER).contentType(MediaType.APPLICATION_JSON)
                .content("{\"status\":\"LOST\"}"))
            .andExpect(status().isBadRequest());
        verify(service, times(1)).updateDistributionStatus(anyString(), any());
    }

    // ---- teams

    @Test
    void shouldListTeamsWithDistrictAndStatusFilters() throws Exception {
        when(service.listTeams("Colombo", "AVAILABLE")).thenReturn(List.of(Map.of("id", "RT-1", "status", "AVAILABLE")));

        mvc.perform(get(BASE + "/teams").param("district", "Colombo").param("status", "AVAILABLE").header("Authorization", OFFICER))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$[0].id").value("RT-1"));
    }

    @Test
    void shouldAssignTeamRecordingOfficerIdentity() throws Exception {
        when(service.assignTeam(any(), eq("officer-1"), eq("District Officer"))).thenReturn(Map.of("id", "TA-1", "status", "ASSIGNED"));

        mvc.perform(post(BASE + "/team-assignments").header("Authorization", OFFICER).contentType(MediaType.APPLICATION_JSON)
                .content("{\"teamId\":\"RT-1\",\"shelterId\":\"SH-1\",\"expectedEvacuees\":40,\"pickupLocation\":\"Wellawatte\"}"))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.status").value("ASSIGNED"));
    }

    @Test
    void shouldFallBackToEmailWhenOfficerHasNoDisplayName() throws Exception {
        when(service.dispatch("TA-1", "officer-2", "dmc@dmc.lk")).thenReturn(Map.of("status", "DISPATCHED"));

        mvc.perform(post(BASE + "/team-assignments/TA-1/dispatch").header("Authorization", "Bearer dmc-officer-token"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.status").value("DISPATCHED"));
    }

    @Test
    void shouldReturnConflictWhenTeamUnavailable() throws Exception {
        when(service.assignTeam(any(), anyString(), anyString())).thenThrow(new ResponseStatusException(HttpStatus.CONFLICT,
            "Team is no longer available: Navy Boat Rescue Unit 4 is dispatched."));

        mvc.perform(post(BASE + "/team-assignments").header("Authorization", OFFICER).contentType(MediaType.APPLICATION_JSON)
                .content("{\"teamId\":\"RT-2\",\"shelterId\":\"SH-1\",\"expectedEvacuees\":40,\"pickupLocation\":\"Wellawatte\"}"))
            .andExpect(status().isConflict())
            .andExpect(jsonPath("$.message").value(containsString("no longer available")));
    }

    @Test
    void shouldReturnNotFoundWhenTeamMissing() throws Exception {
        when(service.getTeam("RT-NOPE")).thenThrow(new ResponseStatusException(HttpStatus.NOT_FOUND, "Rescue team was not found."));

        mvc.perform(get(BASE + "/teams/RT-NOPE").header("Authorization", OFFICER))
            .andExpect(status().isNotFound());
    }

    @Test
    void shouldRejectInvalidTeamAvailabilityStatus() throws Exception {
        mvc.perform(patch(BASE + "/teams/RT-1/availability").header("Authorization", OFFICER).contentType(MediaType.APPLICATION_JSON)
                .content("{\"status\":\"ASSIGNED\"}"))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.errors.status").exists());
        verify(service, never()).setAvailability(anyString(), any(), anyString());
    }

    @Test
    void shouldRouteAssignmentLifecycleActions() throws Exception {
        when(service.markResponding(eq("TA-1"), anyString(), anyString())).thenReturn(Map.of("status", "RESPONDING"));
        when(service.recordArrival(eq("TA-1"), any(), anyString(), anyString())).thenReturn(Map.of("occupied", 300));
        when(service.cancelAssignment(eq("TA-2"), anyString(), anyString())).thenReturn(Map.of("status", "CANCELLED"));

        mvc.perform(post(BASE + "/team-assignments/TA-1/responding").header("Authorization", OFFICER))
            .andExpect(jsonPath("$.status").value("RESPONDING"));
        mvc.perform(post(BASE + "/team-assignments/TA-1/arrival").header("Authorization", OFFICER).contentType(MediaType.APPLICATION_JSON)
                .content("{\"evacueesDelivered\":50,\"expectedOccupancy\":250}"))
            .andExpect(jsonPath("$.occupied").value(300));
        mvc.perform(post(BASE + "/team-assignments/TA-2/cancel").header("Authorization", OFFICER))
            .andExpect(jsonPath("$.status").value("CANCELLED"));
        verify(service).recordArrival("TA-1", new ArrivalRequest(50, 250), "officer-1", "District Officer");
    }

    @Test
    void shouldReturnShelterDetailAndDashboardOverview() throws Exception {
        when(service.shelter("SH-1")).thenReturn(Map.of("id", "SH-1", "available", 150, "history", List.of()));
        when(service.overview("Colombo")).thenReturn(Map.of("totalShelters", 3, "occupancyRate", 71));

        mvc.perform(get(BASE + "/shelters/SH-1").header("Authorization", OFFICER))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.available").value(150));
        mvc.perform(get(BASE + "/overview").param("district", "Colombo").header("Authorization", OFFICER))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.occupancyRate").value(71));
    }

    @Test
    void shouldUpdateTeamAndAvailabilityAsSignedInOfficer() throws Exception {
        when(service.updateTeam(eq("RT-1"), any(), eq("officer-1"))).thenReturn(Map.of("id", "RT-1", "agency", "Navy"));
        when(service.setAvailability(eq("RT-1"), any(), eq("officer-1"))).thenReturn(Map.of("id", "RT-1", "status", "UNAVAILABLE"));

        mvc.perform(put(BASE + "/teams/RT-1").header("Authorization", OFFICER).contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"Navy Boat Rescue\",\"agency\":\"Navy\",\"district\":\"Colombo\",\"memberCount\":6,"
                    + "\"leader\":\"Lt. K. Senanayake\",\"contactNumber\":\"077 123 0000\",\"capabilities\":[\"Boat Rescue\"]}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.agency").value("Navy"));
        mvc.perform(patch(BASE + "/teams/RT-1/availability").header("Authorization", OFFICER).contentType(MediaType.APPLICATION_JSON)
                .content("{\"status\":\"UNAVAILABLE\"}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.status").value("UNAVAILABLE"));
        verify(service).setAvailability("RT-1", new TeamAvailabilityRequest("UNAVAILABLE"), "officer-1");
    }

    @Test
    void shouldListAssignmentsByStatusAndRedispatchAfterCommFailure() throws Exception {
        when(service.listAssignments("COMM_FAILURE")).thenReturn(List.of(Map.of("id", "TA-1", "status", "COMM_FAILURE")));
        when(service.redispatch("TA-1", "officer-1", "District Officer")).thenReturn(Map.of("id", "TA-1", "status", "DISPATCHED"));

        mvc.perform(get(BASE + "/team-assignments").param("status", "COMM_FAILURE").header("Authorization", OFFICER))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$[0].id").value("TA-1"));
        mvc.perform(post(BASE + "/team-assignments/TA-1/redispatch").header("Authorization", OFFICER))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.status").value("DISPATCHED"));
    }

    @Test
    void shouldDeclareAndCloseEmergencyResponse() throws Exception {
        when(service.startResponse(any(), eq("officer-1"))).thenReturn(Map.of("id", "ER-1", "status", "ACTIVE"));
        when(service.closeResponse("ER-1", "officer-1")).thenReturn(Map.of("id", "ER-1", "status", "CLOSED"));

        mvc.perform(post(BASE + "/active-responses").header("Authorization", OFFICER).contentType(MediaType.APPLICATION_JSON)
                .content("{\"hazardType\":\"FLOOD\",\"district\":\"Colombo\",\"title\":\"Colombo Flood Response\",\"affectedAreas\":[\"Kolonnawa\"]}"))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.status").value("ACTIVE"));
        mvc.perform(post(BASE + "/active-responses/ER-1/close").header("Authorization", OFFICER))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.status").value("CLOSED"));
        mvc.perform(post(BASE + "/active-responses").header("Authorization", OFFICER).contentType(MediaType.APPLICATION_JSON)
                .content("{\"hazardType\":\"METEOR\",\"district\":\"\",\"title\":\"X\"}"))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.errors.hazardType").exists());
        verify(service, times(1)).startResponse(any(), anyString());
    }

    // ---- authorization

    @ParameterizedTest(name = "{0} may use UC2")
    @ValueSource(strings = {"district-officer-token", "dmc-officer-token", "team-member-token"})
    void shouldAllowStaffRolesToAccessCoordination(String token) throws Exception {
        when(service.resources()).thenReturn(List.of());

        mvc.perform(get(BASE + "/resources").header("Authorization", "Bearer " + token))
            .andExpect(status().isOk());
    }

    @Test
    void shouldForbidCommunityVolunteerFromAllocatingResources() throws Exception {
        mvc.perform(post(BASE + "/distributions").header("Authorization", "Bearer volunteer-token").contentType(MediaType.APPLICATION_JSON)
                .content(allocationJson(10, "2099-01-01")))
            .andExpect(status().isForbidden());
        verify(service, never()).allocate(any());
    }

    @Test
    void shouldRejectAnonymousShelterRegistration() throws Exception {
        mvc.perform(post(BASE + "/shelters").contentType(MediaType.APPLICATION_JSON).content(shelterJson(500)))
            .andExpect(status().isUnauthorized());
        verify(service, never()).createShelter(any());
    }

    private static String shelterJson(int capacity) {
        return "{\"name\":\"Colombo Central Emergency Shelter\",\"district\":\"Colombo\",\"address\":\"Galle Road, Colombo 03\","
            + "\"shelterType\":\"Community Hall\",\"managingOrganization\":\"Sri Lanka Red Cross\",\"contactPerson\":\"Mr. P. Silva\","
            + "\"contactNumber\":\"011 234 5678\",\"capacity\":" + capacity + ",\"active\":true,\"facilities\":[\"Toilets\"]}";
    }

    private static String allocationJson(int quantity, String date) {
        return "{\"items\":[{\"resourceId\":\"RS-W\",\"quantity\":" + quantity + "}],\"shelterId\":\"SH-1\","
            + "\"distributionDate\":\"" + date + "\",\"transportMethod\":\"DMC Vehicle\",\"expectedPeople\":0}";
    }
}
