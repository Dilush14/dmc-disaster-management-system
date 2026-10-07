package lk.dmc;

import java.util.Map;
import lk.dmc.repository.PublicProfileRepository;
import lk.dmc.security.FirebaseIdentityService;
import lk.dmc.security.PublicIdentity;
import lk.dmc.service.HazardReportService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(properties = "app.firebase.enabled=false")
@AutoConfigureMockMvc
class PublicApiTests {
    @Autowired MockMvc mvc;
    @MockitoBean FirebaseIdentityService identities;
    @MockitoBean HazardReportService reports;
    @MockitoBean PublicProfileRepository profiles;
    @BeforeEach
    void identity() {
        when(identities.verify("citizen-token"))
            .thenReturn(new PublicIdentity("citizen-1", "citizen@example.com", "Citizen", "CITIZEN"));
        when(identities.verify("staff-token"))
            .thenReturn(new PublicIdentity("staff-1", "staff@example.com", "Staff", "ADMIN"));
    }
    @Test
    void reportsRequireLogin() throws Exception {
        mvc.perform(get("/api/public/hazard-reports/my")).andExpect(status().isUnauthorized());
        verifyNoInteractions(reports);
    }
    @Test
    void staffCannotUsePublicEndpoints() throws Exception {
        mvc.perform(get("/api/public/hazard-reports/my")
            .header("Authorization", "Bearer staff-token"))
            .andExpect(status()
            .isForbidden());
        verifyNoInteractions(reports);
    }
    @Test
    void invalidTokenIsRejected() throws Exception {
        when(identities.verify("bad-token"))
            .thenThrow(new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.UNAUTHORIZED, "Invalid token."));
        mvc.perform(get("/api/public/profile")
            .header("Authorization", "Bearer bad-token"))
            .andExpect(status()
            .isUnauthorized());
    }
    @Test
    void listUsesVerifiedIdentity() throws Exception {
        when(reports.mine(any()))
            .thenReturn(java.util.List.of(Map.of("reportId", "HR-ABC", "status", "PENDING_VERIFICATION")));
        mvc.perform(get("/api/public/hazard-reports/my").header("Authorization", "Bearer citizen-token"))
            .andExpect(status().isOk()).andExpect(jsonPath("$[0].status").value("PENDING_VERIFICATION"));
        verify(reports).mine(argThat(identity -> identity.id().equals("citizen-1")));
    }
    @Test
    void validMultipartReportIsAccepted() throws Exception {
        when(reports.submit(any(), any(), any()))
            .thenReturn(Map.of("reportId", "HR-ABC", "status", "PENDING_VERIFICATION"));
        mvc.perform(multipart("/api/public/hazard-reports")
            .file(json(validJson()))
            .header("Authorization", "Bearer citizen-token"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.reportId").value("HR-ABC"));
    }
    @Test
    void forgedOwnerOrStatusIsRejected() throws Exception {
        String forged = validJson()
            .replace("\"hazardType\"", "\"status\":\"VERIFIED\",\"reporterId\":\"someone-else\",\"hazardType\"");
        mvc.perform(multipart("/api/public/hazard-reports")
            .file(json(forged))
            .header("Authorization", "Bearer citizen-token"))
            .andExpect(status().isBadRequest());
        verifyNoInteractions(reports);
    }
    @Test
    void invalidCoordinatesAreRejected() throws Exception {
        mvc.perform(multipart("/api/public/hazard-reports")
            .file(json(validJson()
            .replace("6.9", "999")))
            .header("Authorization", "Bearer citizen-token"))
            .andExpect(status().isBadRequest()).andExpect(jsonPath("$.errors.latitude").exists());
    }
    @Test
    void profileCannotRequestAdmin() throws Exception {
        mvc.perform(post("/api/public/profile")
            .header("Authorization", "Bearer citizen-token")
            .contentType("application/json")
            .content("{\"name\":\"Citizen\",\"phone\":\"0771234567\",\"role\":\"ADMIN\"}"))
            .andExpect(status().isBadRequest());
        verifyNoInteractions(profiles);
    }
    @Test
    void postCorsPreflightIsAllowedForFrontend() throws Exception {
        mvc.perform(options("/api/public/hazard-reports").header("Origin", "http://localhost:5173")
            .header("Access-Control-Request-Method", "POST")
            .header("Access-Control-Request-Headers", "Authorization,Content-Type"))
            .andExpect(status()
            .isOk())
            .andExpect(header()
            .string("Access-Control-Allow-Origin", "http://localhost:5173"));
    }
    private MockMultipartFile json(String value) {
        return new MockMultipartFile("report",
            "report.json",
            "application/json",
            value.getBytes(java.nio.charset.StandardCharsets.UTF_8));
    }
    private String validJson() {
        return "{\"hazardType\":\"FLOOD\",\"description\":\"Road flooded\",\"latitude\":6.9,\"longitude\":79.8,\"dateTime\":\"2026-01-01T10:00:00Z\",\"clientRequestId\":\"12345678-1234-1234-1234-123456789012\"}";
    }
}
