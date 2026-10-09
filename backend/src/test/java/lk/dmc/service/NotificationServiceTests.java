package lk.dmc.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Map;
import lk.dmc.repository.NotificationRepository;
import lk.dmc.repository.PublicProfileRepository;
import lk.dmc.security.PublicIdentity;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class NotificationServiceTests {
    @Mock NotificationRepository notifications;
    @Mock PublicProfileRepository profiles;
    @Mock NotificationDeliveryService delivery;
    @InjectMocks NotificationService service;

    @Test
    void publishWarningCreatesPerUserNotificationAndDelivers() {
        Map<String, Object> warning = Map.of(
            "id", "HW-1", "title", "Flood", "message", "Evacuate",
            "severity", "HIGH", "affectedAreas", List.of("Colombo"),
            "channels", List.of("MOBILE_APP", "EMAIL"));
        Map<String, Object> profile = Map.of("id", "user-1", "email", "user@example.com");
        when(profiles.findAll()).thenReturn(List.of(profile));

        service.publishWarning(warning);

        verify(notifications).createIfAbsent(eq("user-1_HW-1"), any(Map.class));
        verify(delivery).deliver(warning, profile);
    }

    @Test
    void publishWarningMarksUnselectedChannelsWithoutCallingProviders() {
        Map<String, Object> warning = Map.of("id", "HW-1", "channels", List.of("SMS"));
        when(profiles.findAll()).thenReturn(List.of(Map.of("id", "user-1")));

        service.publishWarning(warning);

        verify(notifications).createIfAbsent(eq("user-1_HW-1"),
            org.mockito.ArgumentMatchers.argThat(data ->
                ((Map<?, ?>) data.get("deliveryStatus")).get("sms").equals("QUEUED")
                    && ((Map<?, ?>) data.get("deliveryStatus")).get("email").equals("NOT_SELECTED")));
        verify(delivery).deliver(eq(warning), any(Map.class));
    }

    @Test
    void publishWarningWithNoSupportedChannelDoesNothing() {
        service.publishWarning(Map.of("id", "HW-1", "channels", List.of("WEBSITE")));

        verifyNoInteractions(profiles, notifications, delivery);
    }

    @Test
    void listAndMarkReadUseAuthenticatedUser() {
        PublicIdentity identity = new PublicIdentity("user-1", "user@example.com", "User", "CITIZEN");
        List<Map<String, Object>> expected = List.of(Map.of("id", "notification-1"));
        when(notifications.findForUser("user-1")).thenReturn(expected);
        when(notifications.markRead("notification-1", "user-1")).thenReturn(expected.get(0));

        assertEquals(expected, service.list(identity));
        assertEquals(expected.get(0), service.markRead("notification-1", identity));
        verify(notifications).findForUser("user-1");
        verify(notifications).markRead("notification-1", "user-1");
    }

    @Test
    void markReadThrowsNotFoundWhenRepositoryReturnsNull() {
        PublicIdentity identity = new PublicIdentity("user-1", "", "User", "CITIZEN");
        when(notifications.markRead("missing", "user-1")).thenReturn(null);

        org.springframework.web.server.ResponseStatusException error =
            org.junit.jupiter.api.Assertions.assertThrows(
                org.springframework.web.server.ResponseStatusException.class,
                () -> service.markRead("missing", identity));

        assertEquals(404, error.getStatusCode().value());
        assertTrue(error.getReason().contains("not found"));
        verify(notifications, never()).findForUser(any());
    }
}
