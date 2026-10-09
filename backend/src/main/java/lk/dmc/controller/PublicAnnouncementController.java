package lk.dmc.controller;

import java.util.Map;
import lk.dmc.service.HazardWarningService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/announcements")
public class PublicAnnouncementController {
    private final HazardWarningService warnings;

    public PublicAnnouncementController(HazardWarningService warnings) {
        this.warnings = warnings;
    }

    @GetMapping
    public Map<String, Object> list() {
        return warnings.publicList();
    }
}
