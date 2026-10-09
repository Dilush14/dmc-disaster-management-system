package lk.dmc.controller;

import jakarta.validation.Valid;
import java.util.List;
import java.util.Map;
import lk.dmc.dto.*;
import lk.dmc.security.PublicIdentity;
import lk.dmc.service.CoordinationService;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
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
    @PostMapping("/active-responses")
    @ResponseStatus(HttpStatus.CREATED)
    public Map<String, Object> startResponse(@Valid @RequestBody EmergencyResponseRequest request,
                                             @AuthenticationPrincipal PublicIdentity identity) {
        return coordination.startResponse(request, identity.id());
    }
    @PostMapping("/active-responses/{id}/close")
    public Map<String, Object> closeResponse(@PathVariable String id, @AuthenticationPrincipal PublicIdentity identity) {
        return coordination.closeResponse(id, identity.id());
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
    @GetMapping("/teams")
    public List<Map<String, Object>> teams(@RequestParam(required = false) String district, @RequestParam(required = false) String status) {
        return coordination.listTeams(district, status);
    }
    @GetMapping("/teams/{id}")
    public Map<String, Object> team(@PathVariable String id) {
        return coordination.getTeam(id);
    }
    @PostMapping("/teams")
    @ResponseStatus(HttpStatus.CREATED)
    public Map<String, Object> createTeam(@Valid @RequestBody TeamRequest request, @AuthenticationPrincipal PublicIdentity identity) {
        return coordination.createTeam(request, identity.id());
    }
    @PutMapping("/teams/{id}")
    public Map<String, Object> updateTeam(@PathVariable String id, @Valid @RequestBody TeamRequest request,
                                          @AuthenticationPrincipal PublicIdentity identity) {
        return coordination.updateTeam(id, request, identity.id());
    }
    @PatchMapping("/teams/{id}/availability")
    public Map<String, Object> setAvailability(@PathVariable String id, @Valid @RequestBody TeamAvailabilityRequest request,
                                               @AuthenticationPrincipal PublicIdentity identity) {
        return coordination.setAvailability(id, request, identity.id());
    }
    @GetMapping("/team-assignments")
    public List<Map<String, Object>> assignments(@RequestParam(required = false) String status) {
        return coordination.listAssignments(status);
    }
    @GetMapping("/team-assignments/{id}")
    public Map<String, Object> assignment(@PathVariable String id) {
        return coordination.getAssignment(id);
    }
    @PostMapping("/team-assignments")
    @ResponseStatus(HttpStatus.CREATED)
    public Map<String, Object> assignTeam(@Valid @RequestBody AssignTeamRequest request, @AuthenticationPrincipal PublicIdentity identity) {
        return coordination.assignTeam(request, identity.id(), displayName(identity));
    }
    @PostMapping("/team-assignments/{id}/support")
    public Map<String, Object> addSupport(@PathVariable String id, @Valid @RequestBody AssignmentSupportRequest request,
                                          @AuthenticationPrincipal PublicIdentity identity) {
        return coordination.addSupport(id, request, identity.id(), displayName(identity));
    }
    @PostMapping("/team-assignments/{id}/cancel")
    public Map<String, Object> cancelAssignment(@PathVariable String id, @AuthenticationPrincipal PublicIdentity identity) {
        return coordination.cancelAssignment(id, identity.id(), displayName(identity));
    }
    @PostMapping("/team-assignments/{id}/dispatch")
    public Map<String, Object> dispatch(@PathVariable String id, @AuthenticationPrincipal PublicIdentity identity) {
        return coordination.dispatch(id, identity.id(), displayName(identity));
    }
    @PostMapping("/team-assignments/{id}/responding")
    public Map<String, Object> markResponding(@PathVariable String id, @AuthenticationPrincipal PublicIdentity identity) {
        return coordination.markResponding(id, identity.id(), displayName(identity));
    }
    @PostMapping("/team-assignments/{id}/arrival")
    public Map<String, Object> recordArrival(@PathVariable String id, @Valid @RequestBody ArrivalRequest request,
                                             @AuthenticationPrincipal PublicIdentity identity) {
        return coordination.recordArrival(id, request, identity.id(), displayName(identity));
    }
    @PostMapping("/team-assignments/{id}/comm-failure")
    public Map<String, Object> reportCommFailure(@PathVariable String id, @AuthenticationPrincipal PublicIdentity identity) {
        return coordination.reportCommFailure(id, identity.id(), displayName(identity));
    }
    @PostMapping("/team-assignments/{id}/escalate")
    public Map<String, Object> escalate(@PathVariable String id, @Valid @RequestBody EscalationRequest request,
                                        @AuthenticationPrincipal PublicIdentity identity) {
        return coordination.escalate(id, request, identity.id(), displayName(identity));
    }
    @PostMapping("/team-assignments/{id}/redispatch")
    public Map<String, Object> redispatch(@PathVariable String id, @AuthenticationPrincipal PublicIdentity identity) {
        return coordination.redispatch(id, identity.id(), displayName(identity));
    }
    @PostMapping("/team-assignments/{id}/reassign")
    public Map<String, Object> reassign(@PathVariable String id, @Valid @RequestBody ReassignTeamRequest request,
                                        @AuthenticationPrincipal PublicIdentity identity) {
        return coordination.reassign(id, request, identity.id(), displayName(identity));
    }

    private static String displayName(PublicIdentity identity) {
        if (identity.name() != null && !identity.name().isBlank()) return identity.name();
        return identity.email();
    }
}
