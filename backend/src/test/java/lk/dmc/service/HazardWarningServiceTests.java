package lk.dmc.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import lk.dmc.dto.HazardWarningRequest;
import lk.dmc.dto.HazardWarningUpdateRequest;
import lk.dmc.repository.HazardWarningRepository;
import lk.dmc.security.PublicIdentity;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class HazardWarningServiceTests {
    @Mock HazardWarningRepository warnings;
    @Mock NotificationService notifications;
    @InjectMocks HazardWarningService service;

    private final PublicIdentity officer =
        new PublicIdentity("officer-1", "officer@dmc.lk", "Officer", "DMC_OFFICER");

    @Test
    void createPersistsTrimmedWarningAndPublishesIt() {
        Instant from = Instant.now().minusSeconds(30);
        Instant until = from.plusSeconds(3600);
        HazardWarningRequest request = new HazardWarningRequest(
            " FLOOD ", List.of("Colombo"), " HIGH ", "  Flood warning ",
            "  Move to safe ground ", from, until, List.of("MOBILE_APP", "SMS"));
        when(warnings.create(any(String.class), any(Map.class)))
            .thenAnswer(invocation -> {
                Map<String, Object> data = new LinkedHashMap<>(invocation.getArgument(1));
                data.put("id", invocation.getArgument(0));
                return data;
            });

        Map<String, Object> result = service.create(request, officer);

        assertTrue(((String) result.get("id")).startsWith("HW-"));
        assertEquals("FLOOD", result.get("type"));
        assertEquals("HIGH", result.get("severity"));
        assertEquals("Flood warning", result.get("title"));
        assertEquals("Move to safe ground", result.get("message"));
        assertEquals("Active", result.get("status"));
        assertEquals("officer-1", result.get("createdBy"));
        verify(warnings).create(eq((String) result.get("id")), any(Map.class));
        verify(notifications).publishWarning(result);
    }

    @Test
    void createKeepsWarningWhenNotificationFanoutFails() {
        Instant from = Instant.now().plusSeconds(3600);
        HazardWarningRequest request = request(from, from.plusSeconds(3600));
        Map<String, Object> stored = Map.of("id", "HW-2026-ABC123", "status", "Scheduled");
        when(warnings.create(any(String.class), any(Map.class))).thenReturn(stored);
        org.mockito.Mockito.doThrow(new RuntimeException("provider unavailable"))
            .when(notifications).publishWarning(stored);

        assertEquals(stored, service.create(request, officer));
        verify(warnings).create(any(String.class), any(Map.class));
    }

    @Test
    void listFiltersAndClampsPagingValues() {
        when(warnings.findAll()).thenReturn(List.of(
            warning("one", "Active", "FLOOD", "HIGH", "River flood"),
            warning("two", "Scheduled", "LANDSLIDE", "MEDIUM", "Slope alert"),
            warning("three", "Expired", "FLOOD", "HIGH", "Old flood")));

        Map<String, Object> result = service.list("river", "", "flood", "high", -2, 0);

        assertEquals(List.of("one"), ((List<Map<String, Object>>) result.get("items"))
            .stream().map(item -> item.get("id")).toList());
        assertEquals(1, result.get("total"));
        assertEquals(0, result.get("page"));
        assertEquals(1, result.get("size"));
        assertEquals(1, result.get("totalPages"));
        assertEquals(1L, result.get("activeCount"));
        assertEquals(1L, result.get("scheduledCount"));
        assertEquals(1L, result.get("expiredCount"));
    }

    @Test
    void listUsesValidityDatesToRefreshActiveStatus() {
        Instant now = Instant.now();
        when(warnings.findAll()).thenReturn(List.of(
            warningWithDates("scheduled", now.plusSeconds(60), now.plusSeconds(120)),
            warningWithDates("expired", now.minusSeconds(120), now.minusSeconds(60))));

        Map<String, Object> result = service.list("", "", "", "", 0, 10);

        List<Map<String, Object>> items = (List<Map<String, Object>>) result.get("items");
        assertEquals("Scheduled", items.get(0).get("status"));
        assertEquals("Expired", items.get(1).get("status"));
    }

    @Test
    void publicListExcludesInactiveAndNonWebsiteWarnings() {
        when(warnings.findAll()).thenReturn(List.of(
            warningWithChannels("active-site", "Active", List.of("WEBSITE")),
            warningWithChannels("scheduled-app", "Scheduled", List.of("MOBILE_APP")),
            warningWithChannels("cancelled-site", "Cancelled", List.of("WEBSITE"))));

        Map<String, Object> result = service.publicList();

        assertEquals(List.of("active-site"), ((List<Map<String, Object>>) result.get("items"))
            .stream().map(item -> item.get("id")).toList());
    }

    @Test
    void updateTrimsFieldsAndAppendsAuditEntry() {
        Map<String, Object> current = new LinkedHashMap<>();
        current.put("id", "HW-1");
        current.put("auditTrail", new ArrayList<>(List.of(
            Map.of("action", "Warning created", "actor", "old@dmc.lk"))));
        when(warnings.find("HW-1")).thenReturn(current);
        when(warnings.update(eq("HW-1"), any(Map.class)))
            .thenAnswer(invocation -> invocation.getArgument(1));

        Map<String, Object> result = service.update("HW-1",
            new HazardWarningUpdateRequest(" Updated ", " New message ", " CRITICAL ",
                List.of(" Gampaha "), Instant.parse("2026-10-10T00:00:00Z")), officer);

        assertEquals("Updated", result.get("title"));
        assertEquals("New message", result.get("message"));
        assertEquals("CRITICAL", result.get("severity"));
        assertEquals("officer-1", result.get("updatedBy"));
        List<Map<String, Object>> audit = (List<Map<String, Object>>) result.get("auditTrail");
        assertEquals(2, audit.size());
        assertEquals("Warning details updated", audit.get(1).get("action"));
        verify(warnings).update(eq("HW-1"), any(Map.class));
    }

    @Test
    void escalateAndCancelRecordTheirDistinctActions() {
        Map<String, Object> current = Map.of("id", "HW-1", "auditTrail", List.of());
        when(warnings.find("HW-1")).thenReturn(current);
        when(warnings.update(eq("HW-1"), any(Map.class)))
            .thenAnswer(invocation -> invocation.getArgument(1));

        Map<String, Object> escalated = service.updateStatus("HW-1", "Escalated", officer);
        Map<String, Object> cancelled = service.updateStatus("HW-1", "Cancelled", officer);

        assertEquals("Escalated", escalated.get("status"));
        assertEquals("Warning escalated",
            ((List<Map<String, Object>>) escalated.get("auditTrail")).get(0).get("action"));
        assertEquals("Cancelled", cancelled.get("status"));
        assertEquals("Warning cancelled",
            ((List<Map<String, Object>>) cancelled.get("auditTrail")).get(0).get("action"));
    }

    @Test
    void findAllDelegatesToRepository() {
        List<Map<String, Object>> expected = List.of(Map.of("id", "HW-1"));
        when(warnings.findAll()).thenReturn(expected);

        assertEquals(expected, service.findAll());
        verify(notifications, never()).publishWarning(any());
    }

    private HazardWarningRequest request(Instant from, Instant until) {
        return new HazardWarningRequest("FLOOD", List.of("Colombo"), "HIGH",
            "Flood", "Evacuate", from, until, List.of("EMAIL"));
    }

    private Map<String, Object> warning(String id, String status, String type,
                                        String severity, String title) {
        return warningWithChannels(id, status, List.of("WEBSITE"), type, severity, title);
    }

    private Map<String, Object> warningWithChannels(String id, String status, List<String> channels) {
        return warningWithChannels(id, status, channels, "FLOOD", "HIGH", id);
    }

    private Map<String, Object> warningWithChannels(String id, String status, List<String> channels,
                                                    String type, String severity, String title) {
        return new LinkedHashMap<>(Map.of("id", id, "status", status, "type", type,
            "severity", severity, "title", title, "channels", channels));
    }

    private Map<String, Object> warningWithDates(String id, Instant from, Instant until) {
        return new LinkedHashMap<>(Map.of("id", id, "status", "Active", "type", "FLOOD",
            "severity", "HIGH", "title", id, "channels", List.of("WEBSITE"),
            "validFrom", from.toString(), "validUntil", until.toString()));
    }
}
