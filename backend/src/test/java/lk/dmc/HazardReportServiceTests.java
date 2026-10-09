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
    void communityVolunteerCanSubmitWithoutPhoto() {
        var volunteer = new PublicIdentity("volunteer", "volunteer@example.com", "Volunteer", "COMMUNITY_VOLUNTEER");

        var report = service.submit(request("Flood water is covering the main road."), null, volunteer);

        assertEquals("COMMUNITY_VOLUNTEER", report.get("reporterRole"));
        assertEquals("PENDING_VERIFICATION", report.get("status"));
        assertNull(report.get("photoUrl"));
        verify(repository).createIfAbsent(anyString(), anyMap());
    }
    @Test
    void rejectsMissingRequiredReportDetailsBeforeSaving() {
        var invalid = new HazardReportRequest("", "", null, null, null, "");

        assertThrows(NullPointerException.class, () -> service.submit(invalid, null, identity));
        verify(repository, never()).createIfAbsent(anyString(), anyMap());
    }
    @Test
    void verifiesPendingReportAndRecordsReviewer() {
        var pending = new HashMap<String, Object>(Map.of(
            "reportId", "HR-VERIFY", "reporterId", "owner", "status", "PENDING_VERIFICATION"));
        when(repository.find("HR-VERIFY")).thenReturn(pending);
        when(repository.update(eq("HR-VERIFY"), anyMap())).thenAnswer(call -> {
            pending.putAll(call.getArgument(1));
            return pending;
        });
        var officer = new PublicIdentity("officer", "officer@example.com", "Officer", "DMC_OFFICER");

        var result = service.verify("HR-VERIFY", officer);

        assertEquals("VERIFIED", result.get("status"));
        assertEquals("officer", result.get("reviewedBy"));
        assertNotNull(result.get("reviewedAt"));
        verify(repository).update(eq("HR-VERIFY"), argThat(updates -> "VERIFIED".equals(updates.get("status"))));
    }
    @Test
    void rejectsReportOnlyWithAReasonAndRecordsReviewer() {
        var pending = new HashMap<String, Object>(Map.of(
            "reportId", "HR-REJECT", "reporterId", "owner", "status", "PENDING_VERIFICATION"));
        when(repository.find("HR-REJECT")).thenReturn(pending);
        when(repository.update(eq("HR-REJECT"), anyMap())).thenAnswer(call -> {
            pending.putAll(call.getArgument(1));
            return pending;
        });
        var officer = new PublicIdentity("officer", "officer@example.com", "Officer", "DMC_OFFICER");

        var result = service.reject("HR-REJECT", "Location could not be verified.", officer);

        assertEquals("REJECTED", result.get("status"));
        assertEquals("Location could not be verified.", result.get("rejectionReason"));
        assertEquals("officer", result.get("reviewedBy"));
        assertNotNull(result.get("reviewedAt"));
    }
    @Test
    void rejectionWithoutReasonLeavesReportUnchanged() {
        var error = assertThrows(ResponseStatusException.class,
            () -> service.reject("HR-REJECT", "  ", identity));

        assertEquals(HttpStatus.BAD_REQUEST, error.getStatusCode());
        verify(repository, never()).update(anyString(), anyMap());
    }
    @Test
    void storageFailureDoesNotCreateAReport() {
        var photo = new ReportPhotoStorage.Photo(new byte[] {1}, "image/png");
        when(photos.validate(any())).thenReturn(photo);
        doThrow(new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Storage unavailable."))
            .when(photos).upload(anyString(), same(photo));

        assertThrows(ResponseStatusException.class,
            () -> service.submit(request("Flood water is covering the main road."), mockPhoto(), identity));

        verify(repository, never()).createIfAbsent(anyString(), anyMap());
    }
    @Test
    void repositoryFailureDoesNotReturnFalseSuccess() {
        doThrow(new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Database unavailable."))
            .when(repository).createIfAbsent(anyString(), anyMap());

        assertThrows(ResponseStatusException.class,
            () -> service.submit(request("Flood water is covering the main road."), null, identity));
    }
    @Test
    void missingReportIsNotFoundWhenReadingIt() {
        when(repository.find("HR-MISSING")).thenReturn(null);

        var error = assertThrows(ResponseStatusException.class,
            () -> service.get("HR-MISSING", identity));

        assertEquals(HttpStatus.NOT_FOUND, error.getStatusCode());
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
    private org.springframework.web.multipart.MultipartFile mockPhoto() {
        return new org.springframework.mock.web.MockMultipartFile("photo", "photo.png", "image/png", new byte[] {1});
    }
}
