package lk.dmc.controller;

import jakarta.validation.Valid;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import lk.dmc.dto.PublicProfileRequest;
import lk.dmc.repository.PublicProfileRepository;
import lk.dmc.security.PublicIdentity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/public/profile")
public class PublicProfileController {
    private final PublicProfileRepository profiles;
    public PublicProfileController(PublicProfileRepository profiles) { this.profiles = profiles; }
    @GetMapping public Map<String, Object> get(@AuthenticationPrincipal PublicIdentity identity) {
        Map<String, Object> stored = profiles.find(identity.id());
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("id", identity.id()); result.put("email", identity.email());
        result.put("name", stored == null ? identity.name() : stored.get("name"));
        result.put("phone", stored == null ? null : stored.get("phone"));
        result.put("role", identity.role());
        return result;
    }
    @PostMapping public Map<String, Object> create(@AuthenticationPrincipal PublicIdentity identity,
                                                   @Valid @RequestBody PublicProfileRequest request) {
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("id", identity.id()); data.put("email", identity.email());
        data.put("name", request.name().trim()); data.put("phone", request.phone().trim());
        data.put("role", request.role()); data.put("createdAt", Instant.now().toString());
        return profiles.createIfAbsent(identity.id(), data);
    }
}
