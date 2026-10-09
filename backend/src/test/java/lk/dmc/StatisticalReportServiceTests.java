package lk.dmc;

import java.util.List;
import java.util.Map;
import lk.dmc.repository.CoordinationStore;
import lk.dmc.repository.StatisticalReportRepository;
import lk.dmc.security.PublicIdentity;
import lk.dmc.service.MonitoringService;
import lk.dmc.service.StatisticalReportService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class StatisticalReportServiceTests {
    @Mock StatisticalReportRepository reportRepository;
    @Mock MonitoringService monitoring;
    @Mock CoordinationStore coordination;

    StatisticalReportService service;

    @BeforeEach
    void setUp() {
        service = new StatisticalReportService(reportRepository, monitoring, coordination);
        lenient().when(monitoring.warnings()).thenReturn(List.of());
        lenient().when(monitoring.hazardReports()).thenReturn(List.of());
        lenient().when(coordination.list(anyString())).thenReturn(List.of());
    }

    @Test
    void generationSucceedsWithEmptyLiveCollectionsAndDoesNotInventRecords() {
        when(reportRepository.create(anyString(), anyMap())).thenAnswer(invocation -> invocation.getArgument(1));

        var generated = service.generate(request("Incident Summary Report"), identity());

        assertEquals("Incident Summary Report", generated.get("reportType"));
        assertTrue(((List<?>) generated.get("alertTimeline")).isEmpty());
        assertTrue(((List<?>) generated.get("citizensReached")).isEmpty());
        assertTrue(((List<?>) generated.get("shelterOccupancy")).isEmpty());
        assertTrue(((List<?>) generated.get("resourceDistribution")).isEmpty());
        assertEquals(0L, generated.get("citizensReachedTotal"));
        verify(reportRepository).create(anyString(), anyMap());
    }

    @Test
    void reportSectionsAreBuiltFromOperationalWarningShelterHistoryAndCompletedDistributions() {
        when(monitoring.warnings()).thenReturn(List.of(Map.of(
            "title", "Flood warning", "status", "Active", "affectedAreas", List.of("Colombo"),
            "createdAt", "2026-09-12T10:00:00Z")));
        when(monitoring.hazardReports()).thenReturn(List.of(Map.of(
            "reportId", "HR-1", "description", "Flooded road", "status", "VERIFIED",
            "location", "Colombo", "submittedAt", "2026-09-13T10:00:00Z")));
        when(coordination.list(CoordinationStore.SHELTERS)).thenReturn(List.of(Map.of(
            "id", "SH-1", "name", "Central School", "district", "Colombo", "capacity", 500, "occupied", 220)));
        when(coordination.list(CoordinationStore.OCCUPANCY_HISTORY)).thenReturn(List.of(Map.of(
            "shelterId", "SH-1", "previousOccupied", 180, "occupied", 220, "capacity", 500,
            "recordedAt", "2026-09-14T10:00:00Z")));
        when(coordination.list(CoordinationStore.DISTRIBUTIONS)).thenReturn(List.of(Map.of(
            "id", "RD-1", "shelterName", "Central School", "district", "Colombo", "expectedPeople", 75,
            "status", "COMPLETED", "distributionDate", "2026-09-15", "createdAt", "2026-09-15T08:00:00Z")));
        when(reportRepository.create(anyString(), anyMap())).thenAnswer(invocation -> invocation.getArgument(1));

        var generated = service.generate(request("District-Wide Report"), identity());

        assertEquals(2, ((List<?>) generated.get("alertTimeline")).size());
        assertEquals(1, ((List<?>) generated.get("shelterOccupancy")).size());
        assertEquals(220L, ((Number) ((Map<?, ?>) ((List<?>) generated.get("shelterOccupancy")).get(0)).get("occupancy")).longValue());
        assertEquals(1, ((List<?>) generated.get("resourceDistribution")).size());
        assertEquals(75L, generated.get("citizensReachedTotal"));
        assertEquals(75L, ((Number) ((Map<?, ?>) ((List<?>) generated.get("citizensReached")).get(0)).get("value")).longValue());
    }

    @Test
    void previewUsesTheSameLiveDataButDoesNotPersistReport() {
        var preview = service.preview(request("District-Wide Report"), identity());

        assertEquals("PREVIEW", preview.get("id"));
        assertEquals("PREVIEW", preview.get("status"));
        verify(reportRepository, never()).create(anyString(), anyMap());
    }

    @Test
    void generationRejectsDateRangesWhereEndPrecedesStart() {
        var config = new java.util.LinkedHashMap<>(request("Incident Summary Report"));
        config.put("dateFrom", "2026-09-20");
        config.put("dateTo", "2026-09-10");

        var error = org.junit.jupiter.api.Assertions.assertThrows(
            org.springframework.web.server.ResponseStatusException.class, () -> service.generate(config, identity()));

        assertEquals(400, error.getStatusCode().value());
    }

    private Map<String, Object> request(String reportType) {
        return Map.of("reportType", reportType, "district", "All Districts",
            "dateFrom", "2026-09-10", "dateTo", "2026-09-20",
            "selectedSections", List.of("Hazard Warnings", "Citizens Reached", "Shelter Occupancy", "Resource Distribution"));
    }

    private PublicIdentity identity() {
        return new PublicIdentity("staff-1", "officer@example.com", "Officer", "DMC_OFFICER");
    }
}
