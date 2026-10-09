package lk.dmc.controller;

import jakarta.validation.Valid;
import java.util.List;
import java.util.Map;
import lk.dmc.dto.HazardWarningRequest;
import lk.dmc.dto.HazardWarningUpdateRequest;
import lk.dmc.security.PublicIdentity;
import lk.dmc.service.HazardWarningService;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/staff/warnings")
public class HazardWarningController {
    private final HazardWarningService warnings;

    public HazardWarningController(HazardWarningService warnings) {
        this.warnings = warnings;
    }

    @GetMapping
    public Map<String, Object> list(
        @RequestParam(defaultValue = "") String search,
        @RequestParam(defaultValue = "") String status,
        @RequestParam(defaultValue = "") String type,
        @RequestParam(defaultValue = "") String severity,
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "10") int size
    ) {
        return warnings.list(search, status, type, severity, page, size);
    }

    @GetMapping("/{id}")
    public Map<String, Object> get(@PathVariable String id) {
        return warnings.get(id);
    }

    @PostMapping
    public Map<String, Object> create(@Valid @RequestBody HazardWarningRequest request,
                                      @AuthenticationPrincipal PublicIdentity identity) {
        return warnings.create(request, identity);
    }

    @PostMapping("/{id}/escalate")
    public Map<String, Object> escalate(@PathVariable String id,
                                        @AuthenticationPrincipal PublicIdentity identity) {
        return warnings.updateStatus(id, "Escalated", identity);
    }

    @PutMapping("/{id}")
    public Map<String, Object> update(@PathVariable String id,
                                      @Valid @RequestBody HazardWarningUpdateRequest request,
                                      @AuthenticationPrincipal PublicIdentity identity) {
        return warnings.update(id, request, identity);
    }

    @PostMapping("/{id}/cancel")
    public Map<String, Object> cancel(@PathVariable String id,
                                     @AuthenticationPrincipal PublicIdentity identity) {
        return warnings.updateStatus(id, "Cancelled", identity);
    }
}
