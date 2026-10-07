package lk.dmc;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.HashMap;
import java.util.Map;
import lk.dmc.dto.HazardReportRequest;
import lk.dmc.repository.HazardReportRepository;
import lk.dmc.security.PublicIdentity;
import lk.dmc.service.HazardReportService;
import lk.dmc.service.ReportPhotoStorage;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class HazardReportServiceTests {
    final HazardReportRepository repository = mock(HazardReportRepository.class);
    final ReportPhotoStorage photos = mock(ReportPhotoStorage.class);
    final HazardReportService service = new HazardReportService(repository, photos);
    final PublicIdentity identity = new PublicIdentity("owner", "person@example.com", "Citizen", "CITIZEN");
    final Map<String, Map<String, Object>> store = new HashMap<>();
    @BeforeEach
    void repository() {
        when(repository.find(anyString())).thenAnswer(call -> store.get(call.getArgument(0)));
        when(repository.createIfAbsent(anyString(), anyMap()))
            .thenAnswer(call -> store.computeIfAbsent(call.getArgument(0), key -> call.getArgument(1)));
    }
    HazardReportRequest request(String description) {
        return new HazardReportRequest("FLOOD",
            description,
            new BigDecimal("6.9271"),
            new BigDecimal("79.8612"),
            OffsetDateTime.parse("2026-01-01T10:00:00Z"),
            "12345678-1234-1234-1234-123456789012");
    }
    @Test
    void serverOwnsIdentityStatusAndSubmissionTime() {
        var report = service.submit(request("Road flooded"), null, identity);
        assertEquals("owner", report.get("reporterId"));
        assertEquals("CITIZEN", report.get("reporterRole"));
        assertEquals("PENDING_VERIFICATION", report.get("status"));
        assertNotNull(report.get("submittedAt"));
        assertFalse(report.containsKey("photoPath"));
        assertFalse(report.containsKey("requestFingerprint"));
    }
    @Test
    void retryReturnsSameReportAndChangedPayloadConflicts() {
        var first = service.submit(request("Road flooded"), null, identity);
        var second = service.submit(request("Road flooded"), null, identity);
        assertEquals(first, second);
        assertEquals(1, store.size());
        var error = assertThrows(ResponseStatusException.class, () -> service.submit(request("Different"), null, identity));
        assertEquals(HttpStatus.CONFLICT, error.getStatusCode());
    }
    @Test
    void reportsAndPhotosArePrivateToOwner() {
        var report = service.submit(request("Flood"), null, identity);
        String id = (String) report.get("reportId");
        var other = new PublicIdentity("other", "other@example.com", "Other", "CITIZEN");
        assertEquals(HttpStatus.NOT_FOUND,
            assertThrows(ResponseStatusException.class, () -> service.get(id, other))
            .getStatusCode());
        assertEquals(HttpStatus.NOT_FOUND,
            assertThrows(ResponseStatusException.class, () -> service.photo(id, other))
            .getStatusCode());
        verify(photos, never()).download(anyString());
        assertEquals(report, service.get(id, identity));
    }
}
