package lk.dmc.service;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import lk.dmc.repository.NotificationRepository;
import lk.dmc.repository.PublicProfileRepository;
import lk.dmc.security.PublicIdentity;
import org.springframework.stereotype.Service;

@Service
public class NotificationService {
    private final NotificationRepository notifications;
    private final PublicProfileRepository profiles;
    private final NotificationDeliveryService delivery;

    public NotificationService(NotificationRepository notifications, PublicProfileRepository profiles,
                               NotificationDeliveryService delivery) {
        this.notifications = notifications;
        this.profiles = profiles;
        this.delivery = delivery;
    }

    public void publishWarning(Map<String, Object> warning) {
        Object channelsValue = warning.get("channels");
        boolean mobile = hasChannel(channelsValue, "MOBILE_APP");
        boolean email = hasChannel(channelsValue, "EMAIL");
        boolean sms = hasChannel(channelsValue, "SMS");
        if (!mobile && !email && !sms) return;
        List<Map<String, Object>> users = profiles.findAll();
        for (Map<String, Object> user : users) {
            String userId = String.valueOf(user.get("id"));
            Map<String, Object> data = new LinkedHashMap<>();
            data.put("recipientId", userId);
            data.put("warningId", warning.get("id"));
            data.put("title", warning.get("title"));
            data.put("message", warning.get("message"));
            data.put("severity", warning.get("severity"));
            data.put("affectedAreas", warning.get("affectedAreas"));
            data.put("channels", channelsValue);
            data.put("createdAt", Instant.now().toString());
            data.put("readAt", null);
            data.put("deliveryStatus", Map.of(
                "mobile", mobile ? "QUEUED" : "NOT_SELECTED",
                "email", email ? "QUEUED" : "NOT_SELECTED",
                "sms", sms ? "QUEUED" : "NOT_SELECTED"
            ));
            notifications.createIfAbsent(userId + "_" + warning.get("id"), data);
            delivery.deliver(warning, user);
        }
    }

    public List<Map<String, Object>> list(PublicIdentity identity) {
        return notifications.findForUser(identity.id());
    }

    public Map<String, Object> markRead(String id, PublicIdentity identity) {
        var result = notifications.markRead(id, identity.id());
        if (result == null) throw new org.springframework.web.server.ResponseStatusException(
            org.springframework.http.HttpStatus.NOT_FOUND, "Notification was not found.");
        return result;
    }

    private boolean hasChannel(Object value, String channel) {
        return value instanceof List<?> values
            && values.stream().anyMatch(item -> channel.equalsIgnoreCase(String.valueOf(item)));
    }
}
