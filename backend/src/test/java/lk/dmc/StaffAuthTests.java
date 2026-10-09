package lk.dmc;

import java.util.Map;
import lk.dmc.repository.StaffRegistrationRepository;
import lk.dmc.security.FirebaseIdentityService;
import lk.dmc.security.PublicIdentity;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(properties = "app.firebase.enabled=false")
@AutoConfigureMockMvc
class StaffAuthTests {
    @Autowired MockMvc mvc;
    @MockitoBean FirebaseIdentityService identities;
    @MockitoBean com.cloudinary.Cloudinary cloudinary;
    @MockitoBean StaffRegistrationRepository registrations;

    @Test
    void onlyTheThreeStaffRolesCanReadStaffProfile() throws Exception {
        mvc.perform(get("/api/staff/profile")).andExpect(status().isUnauthorized());
        for (String role : new String[]{"DMC_OFFICER", "DISTRICT_OFFICER", "RESPONSE_TEAM_MEMBER"}) {
            when(identities.verify(role)).thenReturn(new PublicIdentity("staff-1", "staff@example.com", "Staff", role));
            mvc.perform(get("/api/staff/profile").header("Authorization", "Bearer " + role))
                .andExpect(status().isOk()).andExpect(jsonPath("$.role").value(role));
        }
        for (String role : new String[]{"CITIZEN", "COMMUNITY_VOLUNTEER", "NGO_OFFICER"}) {
            when(identities.verify(role)).thenReturn(new PublicIdentity("other", "other@example.com", "Other", role));
            mvc.perform(get("/api/staff/profile").header("Authorization", "Bearer " + role))
                .andExpect(status().isForbidden());
        }
    }

    @Test
    void registrationImmediatelyActivatesEachValidatedDemoRole() throws Exception {
        when(identities.verify("new-user")).thenReturn(new PublicIdentity("new-uid", "new@example.com", "New", "CITIZEN"));
        when(registrations.createIfAbsent(eq("new-uid"), anyMap())).thenAnswer(call -> call.getArgument(1));
        for (String role : new String[]{"DMC_OFFICER", "DISTRICT_OFFICER", "RESPONSE_TEAM_MEMBER"}) {
            mvc.perform(post("/api/staff/registration").header("Authorization", "Bearer new-user")
                    .contentType("application/json").content(body(role)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value("new-uid"))
                .andExpect(jsonPath("$.role").value(role))
                .andExpect(jsonPath("$.status").value("ACTIVE"));
        }
    }

    @Test
    void registrationRejectsMissingAuthenticationAndForgedRoleFields() throws Exception {
        mvc.perform(post("/api/staff/registration").contentType("application/json").content(body("DMC_OFFICER")))
            .andExpect(status().isUnauthorized());
        when(identities.verify("new-user")).thenReturn(new PublicIdentity("uid", "new@example.com", "New", "CITIZEN"));
        for (String invalid : new String[]{body("ADMIN"), body("CITIZEN"),
                body("DMC_OFFICER").replace("{", "{\"role\":\"ADMIN\",")}) {
            mvc.perform(post("/api/staff/registration").header("Authorization", "Bearer new-user")
                    .contentType("application/json").content(invalid))
                .andExpect(status().isBadRequest());
        }
        verifyNoInteractions(registrations);
    }

    private String body(String role) {
        return "{\"name\":\"Staff User\",\"phone\":\"0771234567\",\"requestedRole\":\"" + role + "\"}";
    }
}
