package lk.dmc.controller;

import jakarta.validation.Valid;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import lk.dmc.dto.StaffRegistrationRequest;
import lk.dmc.repository.StaffRegistrationRepository;
import lk.dmc.security.PublicIdentity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/staff")
public class StaffAuthController {
    private final StaffRegistrationRepository registrations;

    public StaffAuthController(StaffRegistrationRepository registrations) {
        this.registrations = registrations;
    }

    @GetMapping("/profile")
    public Map<String, Object> profile(@AuthenticationPrincipal PublicIdentity identity) {
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("id", identity.id());
        result.put("email", identity.email());
        result.put("name", identity.name());
        result.put("role", identity.role());
        return result;
    }

    @PostMapping("/registration")
    public Map<String, Object> register(@AuthenticationPrincipal PublicIdentity identity,
                                        @Valid @RequestBody StaffRegistrationRequest request) {
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("id", identity.id());
        data.put("email", identity.email());
        data.put("name", request.name().trim());
        data.put("phone", request.phone().trim());
        data.put("requestedRole", request.requestedRole());
        data.put("role", request.requestedRole());
        data.put("status", "ACTIVE");
        data.put("createdAt", Instant.now().toString());
        // University demo: immediately enable the validated, selected staff role.
        return registrations.createIfAbsent(identity.id(), data);
    }
}
