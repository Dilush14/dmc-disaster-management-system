package lk.dmc;

import lk.dmc.repository.PublicProfileRepository;
import lk.dmc.security.FirebaseIdentityService;
import lk.dmc.security.PublicIdentity;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class StaffCoordinationApiTests {
    @Nested
    @SpringBootTest(properties = {"app.firebase.enabled=false"})
    @AutoConfigureMockMvc
    class Locked {
        @Autowired MockMvc mvc;
        @MockitoBean FirebaseIdentityService identities;
        @MockitoBean com.cloudinary.Cloudinary cloudinary;
        @MockitoBean PublicProfileRepository profiles;

        @BeforeEach
        void identity() {
            when(identities.verify("citizen-token"))
                .thenReturn(new PublicIdentity("citizen-1", "citizen@example.com", "Citizen", "CITIZEN"));
            when(identities.verify("officer-token"))
                .thenReturn(new PublicIdentity("officer-1", "officer@example.com", "Officer", "DISTRICT_OFFICER"));
        }

        @Test
        void anonymousIsRejected() throws Exception {
            mvc.perform(get("/api/staff/resources-shelters/shelters")).andExpect(status().isUnauthorized());
        }

        @Test
        void citizenIsForbidden() throws Exception {
            mvc.perform(get("/api/staff/resources-shelters/shelters").header("Authorization", "Bearer citizen-token"))
                .andExpect(status().isForbidden());
        }

        @Test
        void districtOfficerRoleIsAllowed() throws Exception {
            mvc.perform(get("/api/staff/resources-shelters/shelters").header("Authorization", "Bearer officer-token"))
                .andExpect(status().isOk());
        }
    }

    @Nested
    @SpringBootTest(properties = "app.firebase.enabled=false")
    @AutoConfigureMockMvc
    class SignedInOfficer {
        @Autowired MockMvc mvc;
        @MockitoBean FirebaseIdentityService identities;
        @MockitoBean com.cloudinary.Cloudinary cloudinary;
        @MockitoBean PublicProfileRepository profiles;

        @BeforeEach
        void identity() {
            when(identities.verify("officer-token"))
                .thenReturn(new PublicIdentity("officer-1", "officer@example.com", "Officer", "DMC_OFFICER"));
        }

        @Test
        void sheltersAreListedWithAvailableSpace() throws Exception {
            mvc.perform(get("/api/staff/resources-shelters/shelters").param("district", "Colombo")
                    .header("Authorization", "Bearer officer-token"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.id == 'SH-009')].available").value(120));
        }

        @Test
        void activeResponsesAreListedForDistrict() throws Exception {
            mvc.perform(get("/api/staff/resources-shelters/active-responses").param("district", "Colombo")
                    .header("Authorization", "Bearer officer-token"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].title").value("Colombo Flood Response"))
                .andExpect(jsonPath("$[0].hazardType").value("FLOOD"));
        }

        @Test
        void activeResponsesAreListedWithoutDistrict() throws Exception {
            mvc.perform(get("/api/staff/resources-shelters/active-responses").header("Authorization", "Bearer officer-token"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.id == 'ER-001')].status").value("ACTIVE"));
        }

        @Test
        void activeResponsesAreFilteredByDistrict() throws Exception {
            mvc.perform(get("/api/staff/resources-shelters/active-responses").param("district", "Kandy")
                    .header("Authorization", "Bearer officer-token"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));
        }

        @Test
        void invalidOccupancyIsRejected() throws Exception {
            mvc.perform(patch("/api/staff/resources-shelters/shelters/SH-009/occupancy").header("Authorization", "Bearer officer-token")
                    .contentType(MediaType.APPLICATION_JSON).content("{\"occupied\":-1,\"expectedOccupancy\":380}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.occupied").exists());
        }

        @Test
        void teamsAreListedAndFiltered() throws Exception {
            mvc.perform(get("/api/staff/resources-shelters/teams").param("district", "Colombo").param("status", "AVAILABLE")
                    .header("Authorization", "Bearer officer-token"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(3))
                .andExpect(jsonPath("$[0].id").value("RT-001"));
        }

        @Test
        void teamIsCreatedWithValidation() throws Exception {
            mvc.perform(post("/api/staff/resources-shelters/teams").header("Authorization", "Bearer officer-token")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("{\"name\":\"\",\"agency\":\"Pirates\",\"district\":\"Galle\",\"memberCount\":0,"
                        + "\"leader\":\"A\",\"contactNumber\":\"abc\",\"capabilities\":[]}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.name").exists())
                .andExpect(jsonPath("$.errors.agency").exists())
                .andExpect(jsonPath("$.errors.memberCount").exists())
                .andExpect(jsonPath("$.errors.contactNumber").exists());
            mvc.perform(post("/api/staff/resources-shelters/teams").header("Authorization", "Bearer officer-token")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("{\"name\":\"Galle Navy Rescue\",\"agency\":\"Navy\",\"district\":\"Galle\",\"memberCount\":6,"
                        + "\"leader\":\"Lt. A. Perera\",\"contactNumber\":\"077 123 0000\",\"capabilities\":[\"Boat Rescue\"]}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("AVAILABLE"))
                .andExpect(jsonPath("$.updatedBy").value("officer-1"));
        }

        @Test
        void availabilityIsBlockedWhileDispatched() throws Exception {
            mvc.perform(patch("/api/staff/resources-shelters/teams/RT-004/availability").header("Authorization", "Bearer officer-token")
                    .contentType(MediaType.APPLICATION_JSON).content("{\"status\":\"AVAILABLE\"}"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("dispatched")));
        }

        @Test
        void overAllocationReturnsConflict() throws Exception {
            mvc.perform(post("/api/staff/resources-shelters/distributions").header("Authorization", "Bearer officer-token").contentType(MediaType.APPLICATION_JSON)
                    .content("{\"items\":[{\"resourceId\":\"RS-003\",\"quantity\":1000}],\"shelterId\":\"SH-002\","
                        + "\"distributionDate\":\"2099-01-01\",\"transportMethod\":\"DMC Vehicle\"}"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("Insufficient stock")));
        }
    }
}
