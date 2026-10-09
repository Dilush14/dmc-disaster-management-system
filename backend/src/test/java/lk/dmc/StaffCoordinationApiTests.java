package lk.dmc;

import lk.dmc.repository.PublicProfileRepository;
import lk.dmc.repository.CoordinationStore;
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
        @Autowired CoordinationStore store;
        @MockitoBean FirebaseIdentityService identities;
        @MockitoBean com.cloudinary.Cloudinary cloudinary;
        @MockitoBean PublicProfileRepository profiles;

        @BeforeEach
        void setupOperationalRecords() {
            when(identities.verify("officer-token"))
                .thenReturn(new PublicIdentity("officer-1", "officer@example.com", "Officer", "DMC_OFFICER"));
            store.transaction(tx -> {
                tx.set(CoordinationStore.SHELTERS, "SH-009", java.util.Map.of("id", "SH-009", "name", "Colombo Community Centre",
                    "district", "Colombo", "address", "Test address", "shelterType", "Community Hall", "capacity", 500,
                    "occupied", 380, "active", true, "facilities", java.util.List.of(), "updatedAt", "2026-09-10T00:00:00Z"));
                tx.set(CoordinationStore.SHELTERS, "SH-002", java.util.Map.of("id", "SH-002", "name", "Gampaha Town Hall",
                    "district", "Gampaha", "address", "Test address", "shelterType", "Community Hall", "capacity", 800,
                    "occupied", 560, "active", true, "facilities", java.util.List.of(), "updatedAt", "2026-09-10T00:00:00Z"));
                tx.set(CoordinationStore.RESOURCES, "RS-003", java.util.Map.of("id", "RS-003", "name", "Medical Kits",
                    "category", "Medical Supplies", "unit", "Kit", "totalQuantity", 5000, "available", 580,
                    "lowStockThreshold", 1000, "updatedAt", "2026-09-10T00:00:00Z"));
                return null;
            });
        }

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
        void invalidOccupancyIsRejected() throws Exception {
            mvc.perform(patch("/api/staff/resources-shelters/shelters/SH-009/occupancy").header("Authorization", "Bearer officer-token")
                    .contentType(MediaType.APPLICATION_JSON).content("{\"occupied\":-1,\"expectedOccupancy\":380}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.occupied").exists());
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
