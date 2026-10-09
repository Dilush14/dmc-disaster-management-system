package lk.dmc.controller;

import java.util.List;
import java.util.Map;
import lk.dmc.security.PublicIdentity;
import lk.dmc.service.NotificationService;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/public/notifications")
public class PublicNotificationController {
    private final NotificationService notifications;

    public PublicNotificationController(NotificationService notifications) {
        this.notifications = notifications;
    }

    @GetMapping
    public List<Map<String, Object>> list(@AuthenticationPrincipal PublicIdentity identity) {
        return notifications.list(identity);
    }

    @PostMapping("/{id}/read")
    public Map<String, Object> markRead(@PathVariable String id,
                                        @AuthenticationPrincipal PublicIdentity identity) {
        return notifications.markRead(id, identity);
    }
}
