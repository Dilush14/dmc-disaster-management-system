package lk.dmc.controller;

import jakarta.validation.Valid;
import java.util.List;
import java.util.Map;
import lk.dmc.dto.*;
import lk.dmc.service.CoordinationService;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/staff/resources-shelters")
public class StaffCoordinationController {
    private final CoordinationService coordination;
    public StaffCoordinationController(CoordinationService coordination) {
        this.coordination = coordination;
    }
    @GetMapping("/active-responses")
    public List<Map<String, Object>> activeResponses(@RequestParam(required = false) String district) {
        return coordination.activeResponses(district);
    }
    @GetMapping("/overview")
    public Map<String, Object> overview(@RequestParam(required = false) String district) {
        return coordination.overview(district);
    }
    @GetMapping("/alerts")
    public Map<String, Object> alerts() {
        return coordination.alerts();
    }
    @GetMapping("/shelters")
    public List<Map<String, Object>> shelters(@RequestParam(required = false) String district) {
        return coordination.shelters(district);
    }
    @GetMapping("/shelters/{id}")
    public Map<String, Object> shelter(@PathVariable String id) {
        return coordination.shelter(id);
    }
    @PostMapping("/shelters")
    @ResponseStatus(HttpStatus.CREATED)
    public Map<String, Object> createShelter(@Valid @RequestBody ShelterRequest request) {
        return coordination.createShelter(request);
    }
    @PutMapping("/shelters/{id}")
    public Map<String, Object> updateShelter(@PathVariable String id, @Valid @RequestBody ShelterRequest request) {
        return coordination.updateShelter(id, request);
    }
    @PatchMapping("/shelters/{id}/occupancy")
    public Map<String, Object> updateOccupancy(@PathVariable String id, @Valid @RequestBody OccupancyUpdateRequest request) {
        return coordination.updateOccupancy(id, request);
    }
    @GetMapping("/resources")
    public List<Map<String, Object>> resources() {
        return coordination.resources();
    }
    @PostMapping("/resources")
    @ResponseStatus(HttpStatus.CREATED)
    public Map<String, Object> createResource(@Valid @RequestBody ResourceRequest request) {
        return coordination.createResource(request);
    }
    @PutMapping("/resources/{id}")
    public Map<String, Object> updateResource(@PathVariable String id, @Valid @RequestBody ResourceRequest request) {
        return coordination.updateResource(id, request);
    }
    @GetMapping("/distributions")
    public List<Map<String, Object>> distributions(@RequestParam(required = false) String district) {
        return coordination.distributions(district);
    }
    @PostMapping("/distributions")
    @ResponseStatus(HttpStatus.CREATED)
    public Map<String, Object> allocate(@Valid @RequestBody DistributionRequest request) {
        return coordination.allocate(request);
    }
    @PatchMapping("/distributions/{id}/status")
    public Map<String, Object> updateStatus(@PathVariable String id, @Valid @RequestBody DistributionStatusRequest request) {
        return coordination.updateDistributionStatus(id, request);
    }
}
