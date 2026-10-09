package lk.dmc.controller;

import java.util.List;
import java.util.Map;
import lk.dmc.security.PublicIdentity;
import lk.dmc.service.HazardReportService;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/staff/hazard-reports")
public class StaffHazardReportController {
    private final HazardReportService reports;
    public StaffHazardReportController(HazardReportService reports) { this.reports = reports; }
    @GetMapping public List<Map<String, Object>> list() { return reports.staffList(); }
    @GetMapping("/{id}") public Map<String, Object> get(@PathVariable String id) { return reports.staffGet(id); }
    @PostMapping("/{id}/verify")
    public Map<String, Object> verify(@PathVariable String id, @AuthenticationPrincipal PublicIdentity identity) {
        return reports.verify(id, identity);
    }
    @PostMapping(value = "/{id}/reject", consumes = MediaType.APPLICATION_JSON_VALUE)
    public Map<String, Object> reject(@PathVariable String id, @RequestBody(required = false) Map<String, String> body,
                                      @AuthenticationPrincipal PublicIdentity identity) {
        return reports.reject(id, body == null ? null : body.get("reason"), identity);
    }
    @PostMapping("/{id}/assign")
    public Map<String, Object> assign(@PathVariable String id, @RequestBody Map<String, String> body,
                                      @AuthenticationPrincipal PublicIdentity identity) {
        return reports.assign(id, body.getOrDefault("team", "Response Team"), identity);
    }
    @GetMapping("/{id}/photo")
    public ResponseEntity<byte[]> photo(@PathVariable String id) {
        var photo = reports.staffPhoto(id);
        return ResponseEntity.ok().cacheControl(CacheControl.noStore())
            .contentType(MediaType.parseMediaType(photo.contentType()))
            .header("X-Content-Type-Options", "nosniff").body(photo.bytes());
    }
}
