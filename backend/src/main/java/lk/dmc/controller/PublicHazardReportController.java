package lk.dmc.controller;

import jakarta.validation.Valid;
import java.util.List;
import java.util.Map;
import lk.dmc.dto.HazardReportRequest;
import lk.dmc.security.PublicIdentity;
import lk.dmc.service.HazardReportService;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/public/hazard-reports")
public class PublicHazardReportController {
    private final HazardReportService reports;
    public PublicHazardReportController(HazardReportService reports) { this.reports = reports; }
    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public Map<String, Object> submit(@Valid @RequestPart("report") HazardReportRequest request,
        @RequestPart(value = "photo", required = false) MultipartFile photo, @AuthenticationPrincipal PublicIdentity identity) {
        return reports.submit(request, photo, identity);
    }
    @GetMapping("/my") public List<Map<String, Object>> mine(@AuthenticationPrincipal PublicIdentity identity) { return reports.mine(identity); }
    @GetMapping("/{id}") public Map<String, Object> get(@PathVariable String id, @AuthenticationPrincipal PublicIdentity identity) { return reports.get(id, identity); }
    @GetMapping("/{id}/photo") public ResponseEntity<byte[]> photo(@PathVariable String id, @AuthenticationPrincipal PublicIdentity identity) {
        var photo = reports.photo(id, identity);
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).contentType(MediaType.parseMediaType(photo.contentType()))
            .header("X-Content-Type-Options", "nosniff").body(photo.bytes());
    }
}
