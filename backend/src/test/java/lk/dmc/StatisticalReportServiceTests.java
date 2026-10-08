package lk.dmc;

import java.util.List;
import java.util.Map;
import lk.dmc.repository.MonitoringDataRepository;
import lk.dmc.repository.StatisticalReportRepository;
import lk.dmc.security.PublicIdentity;
import lk.dmc.service.MonitoringService;
import lk.dmc.service.StatisticalReportService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.server.ResponseStatusException;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.lenient;

@ExtendWith(MockitoExtension.class)
class StatisticalReportServiceTests {
    @Mock StatisticalReportRepository reportRepository;
    @Mock MonitoringService monitoring;
    @Mock MonitoringDataRepository data;

    StatisticalReportService service;

    @BeforeEach
    void setUp() {
        service = new StatisticalReportService(reportRepository, monitoring, data);
        lenient().when(monitoring.warnings()).thenReturn(List.of(Map.of("title", "Flood warning", "status", "Active", "district", "Colombo", "createdAt", "2026-09-12T10:00:00Z")));
        lenient().when(monitoring.hazardReports()).thenReturn(List.of(Map.of("reportId", "HR-1", "status", "VERIFIED", "district", "Colombo", "submittedAt", "2026-09-13T10:00:00Z")));
        lenient().when(data.findAll(anyString())).thenReturn(List.of());
    }

    @Test
    void generationRejectsMissingShelterOccupancyForSelectedSection() {
        var error = assertThrows(ResponseStatusException.class, () -> service.generate(request("Shelter Occupancy"), identity()));

        assertEquals(422, error.getStatusCode().value());
        org.junit.jupiter.api.Assertions.assertTrue(error.getReason().contains("shelter occupancy records"));
    }

    @Test
    void generationRejectsMissingCitizensReachedRecordsWithoutUsingWarningRecipients() {
        var error = assertThrows(ResponseStatusException.class, () -> service.generate(request("Citizens Reached"), identity()));

        assertEquals(422, error.getStatusCode().value());
        org.junit.jupiter.api.Assertions.assertTrue(error.getReason().contains("citizens-reached records"));
    }

    @Test
    void generationRejectsDateRangesWhereEndPrecedesStart() {
        var config = new java.util.LinkedHashMap<>(request("Executive Summary"));
        config.put("dateFrom", "2026-09-20");
        config.put("dateTo", "2026-09-10");

        var error = assertThrows(ResponseStatusException.class, () -> service.generate(config, identity()));

        assertEquals(400, error.getStatusCode().value());
    }

    @Test
    void reachedCountsComeFromDedicatedRecordsAndReportIsPersisted() {
        when(data.findAll("citizensReachedRecords")).thenReturn(List.of(Map.of(
            "programName", "Water Assistance", "district", "Colombo", "citizensReached", 2500, "date", "2026-09-14")));
        when(reportRepository.create(anyString(), org.mockito.ArgumentMatchers.anyMap()))
            .thenAnswer(invocation -> invocation.getArgument(1));

        var generated = service.generate(request("Citizens Reached"), identity());

        assertEquals(List.of(Map.of("label", "Water Assistance", "district", "Colombo", "value", 2500, "date", "2026-09-14")), generated.get("citizensReached"));
        verify(reportRepository).create(anyString(), org.mockito.ArgumentMatchers.anyMap());
    }

    private Map<String, Object> request(String section) {
        return Map.of("reportType", "District-Wide Report", "district", "Colombo",
            "dateFrom", "2026-09-10", "dateTo", "2026-09-20", "selectedSections", List.of(section));
    }

    private PublicIdentity identity() {
        return new PublicIdentity("staff-1", "officer@example.com", "Officer", "DMC_OFFICER");
    }
}