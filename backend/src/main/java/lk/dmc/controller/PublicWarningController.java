package lk.dmc.controller;

import java.util.Map;
import lk.dmc.service.HazardWarningService;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import lk.dmc.security.PublicIdentity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/public/warnings")
public class PublicWarningController {
    private final HazardWarningService warnings;

    public PublicWarningController(HazardWarningService warnings) {
        this.warnings = warnings;
    }

    @GetMapping
    public Map<String, Object> list(@AuthenticationPrincipal PublicIdentity identity) {
        return warnings.publicList();
    }
}
