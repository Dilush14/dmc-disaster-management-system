package lk.dmc.controller;

import java.util.List;
import java.util.Map;
import lk.dmc.service.MonitoringService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/staff/monitoring")
public class StaffMonitoringController {
    private final MonitoringService monitoring;

    public StaffMonitoringController(MonitoringService monitoring) {
        this.monitoring = monitoring;
    }

    @GetMapping
    public Map<String, Object> dashboard() {
        return monitoring.dashboard();
    }

    @GetMapping("/{district}")
    public Map<String, Object> district(@PathVariable String district) {
        return monitoring.district(district);
    }

    @GetMapping("/{district}/realtime")
    public Map<String, Object> realtime(@PathVariable String district) {
        return monitoring.realtime(district);
    }

    @GetMapping("/{district}/resources")
    public Map<String, Object> resources(@PathVariable String district) {
        return monitoring.resources(district);
    }

    @GetMapping("/{district}/occupancy")
    public List<Map<String, Object>> occupancy(@PathVariable String district) {
        return monitoring.occupancyHistory(district);
    }

    @GetMapping("/{district}/distributions")
    public List<Map<String, Object>> distributions(@PathVariable String district) {
        return monitoring.resourceDistributions(district);
    }
}