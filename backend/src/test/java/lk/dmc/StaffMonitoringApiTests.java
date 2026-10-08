package lk.dmc;

import lk.dmc.repository.MonitoringDataRepository;
import lk.dmc.repository.HazardReportRepository;
import lk.dmc.repository.HazardWarningRepository;
import lk.dmc.repository.StatisticalReportRepository;
import lk.dmc.security.FirebaseIdentityService;
import lk.dmc.security.PublicIdentity;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(properties = "app.firebase.enabled=false")
@AutoConfigureMockMvc
class StaffMonitoringApiTests {
    @Autowired MockMvc mvc;
    @MockitoBean FirebaseIdentityService identities;
    @MockitoBean MonitoringDataRepository monitoringData;
    @MockitoBean HazardWarningRepository warningRepository;
    @MockitoBean HazardReportRepository hazardReportRepository;
    @MockitoBean StatisticalReportRepository reports;

    @Test
    void uc4MonitoringRoutesRequireStaffAuthentication() throws Exception {
        mvc.perform(get("/api/staff/monitoring")).andExpect(status().isUnauthorized());
        when(identities.verify("citizen")).thenReturn(new PublicIdentity("citizen-1", "citizen@example.com", "Citizen", "CITIZEN"));
        mvc.perform(get("/api/staff/monitoring/Colombo").header("Authorization", "Bearer citizen"))
            .andExpect(status().isForbidden());
    }

    @Test
    void monitoringDashboardIsAvailableToStaffAndReportsMissingOptionalCollectionsAsEmpty() throws Exception {
        when(identities.verify("officer")).thenReturn(new PublicIdentity("staff-1", "officer@example.com", "Officer", "DMC_OFFICER"));
        when(monitoringData.findAll(org.mockito.ArgumentMatchers.anyString())).thenReturn(java.util.List.of());
        when(warningRepository.findAll()).thenReturn(java.util.List.of());
        when(hazardReportRepository.findAll()).thenReturn(java.util.List.of());

        mvc.perform(get("/api/staff/monitoring").header("Authorization", "Bearer officer"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.activeWarnings").exists())
            .andExpect(jsonPath("$.dataStatus.sheltersAvailable").value(false));
    }

    @Test
    void reportGenerationRejectsMissingRequiredConfiguration() throws Exception {
        when(identities.verify("officer")).thenReturn(new PublicIdentity("staff-1", "officer@example.com", "Officer", "DMC_OFFICER"));
        mvc.perform(post("/api/staff/reports").header("Authorization", "Bearer officer")
                .contentType("application/json").content("{}"))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.message").exists());
    }
}