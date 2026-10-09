package lk.dmc;

import java.util.List;
import java.util.Map;
import lk.dmc.repository.MonitoringDataRepository;
import lk.dmc.service.HazardReportService;
import lk.dmc.service.HazardWarningService;
import lk.dmc.service.MonitoringService;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class MonitoringServiceHazardReportTests {
    final HazardWarningService warnings = mock(HazardWarningService.class);
    final HazardReportService reports = mock(HazardReportService.class);
    final MonitoringDataRepository data = mock(MonitoringDataRepository.class);
    final MonitoringService service = new MonitoringService(warnings, reports, data);

    @Test
    void onlyVerifiedReportsContributeToOfficialMonitoringCount() {
        when(warnings.list("", "", "", "", 0, 100)).thenReturn(Map.of("items", List.of()));
        when(reports.staffList()).thenReturn(List.of(
            Map.of("reportId", "HR-1", "status", "VERIFIED"),
            Map.of("reportId", "HR-2", "status", "PENDING_VERIFICATION"),
            Map.of("reportId", "HR-3", "status", "REJECTED"),
            Map.of("reportId", "HR-4", "status", "SUSPICIOUS")));
        when(data.findAll(anyString())).thenReturn(List.of());

        var dashboard = service.dashboard();

        assertEquals(1L, dashboard.get("verifiedReports"));
    }

    @Test
    void verifiedReportWithDistrictAppearsInDistrictSituation() {
        when(warnings.list("", "", "", "", 0, 100)).thenReturn(Map.of("items", List.of()));
        when(reports.staffList()).thenReturn(List.of(
            Map.of("reportId", "HR-1", "status", "VERIFIED", "district", "Colombo"),
            Map.of("reportId", "HR-2", "status", "VERIFIED", "district", "Kandy")));
        when(data.findAll(anyString())).thenReturn(List.of());

        var situation = service.district("Colombo");

        assertEquals(1, ((List<?>) situation.get("hazardReports")).size());
        assertEquals(1, ((List<?>) service.realtime("Colombo").get("activeItems")).size());
    }
}
