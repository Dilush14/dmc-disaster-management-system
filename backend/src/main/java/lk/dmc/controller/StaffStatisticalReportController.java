package lk.dmc.controller;

import java.util.List;
import java.util.Map;
import lk.dmc.security.PublicIdentity;
import lk.dmc.service.StatisticalReportService;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/staff/reports")
public class StaffStatisticalReportController {
    private final StatisticalReportService reports;

    public StaffStatisticalReportController(StatisticalReportService reports) {
        this.reports = reports;
    }

    @PostMapping
    public Map<String, Object> generate(@RequestBody Map<String, Object> request,
                                        @AuthenticationPrincipal PublicIdentity identity) {
        return reports.generate(request, identity);
    }

    @PostMapping("/preview")
    public Map<String, Object> preview(@RequestBody Map<String, Object> request,
                                      @AuthenticationPrincipal PublicIdentity identity) {
        return reports.preview(request, identity);
    }

    @GetMapping
    public List<Map<String, Object>> list() {
        return reports.list();
    }

    @GetMapping("/{reportId}")
    public Map<String, Object> get(@PathVariable String reportId) {
        return reports.get(reportId);
    }
}