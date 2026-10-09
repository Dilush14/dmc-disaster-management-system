package lk.dmc.service;

import java.time.Instant;
import java.time.Year;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import lk.dmc.dto.HazardWarningRequest;
import lk.dmc.dto.HazardWarningUpdateRequest;
import lk.dmc.repository.HazardWarningRepository;
import lk.dmc.security.PublicIdentity;
import org.springframework.stereotype.Service;

@Service
public class HazardWarningService {
    private final HazardWarningRepository warnings;
    private final NotificationService notifications;

    public HazardWarningService(HazardWarningRepository warnings, NotificationService notifications) {
        this.warnings = warnings;
        this.notifications = notifications;
    }

    public Map<String, Object> list(String search, String status, String type, String severity, int page, int size) {
        var allWarnings = warnings.findAll().stream()
            .map(this::withCurrentStatus)
            .toList();
        var all = allWarnings.stream()
            .filter(item -> matches(item, search, status, type, severity))
            .toList();
        int safeSize = Math.max(1, Math.min(size, 100));
        int safePage = Math.max(0, page);
        int from = Math.min(safePage * safeSize, all.size());
        int to = Math.min(from + safeSize, all.size());
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("items", all.subList(from, to));
        result.put("total", all.size());
        result.put("page", safePage);
        result.put("size", safeSize);
        result.put("totalPages", (int) Math.ceil((double) all.size() / safeSize));
        result.put("activeCount", allWarnings.stream().filter(item -> "Active".equals(item.get("status"))).count());
        result.put("scheduledCount", allWarnings.stream().filter(item -> "Scheduled".equals(item.get("status"))).count());
        result.put("expiredCount", allWarnings.stream().filter(item -> "Expired".equals(item.get("status"))).count());
        return result;
    }

    public java.util.List<Map<String, Object>> findAll() {
        return warnings.findAll();
    }

    private boolean matches(Map<String, Object> item, String search, String status, String type, String severity) {
        String query = search == null ? "" : search.trim().toLowerCase();
        String text = String.valueOf(item.getOrDefault("id", "")) + " "
            + String.valueOf(item.getOrDefault("title", "")) + " "
            + String.valueOf(item.getOrDefault("type", ""));
        return (query.isBlank() || text.toLowerCase().contains(query))
            && (status == null || status.isBlank() || status.equalsIgnoreCase(String.valueOf(item.get("status"))))
            && (type == null || type.isBlank() || type.equalsIgnoreCase(String.valueOf(item.get("type"))))
            && (severity == null || severity.isBlank() || severity.equalsIgnoreCase(String.valueOf(item.get("severity"))));
    }

    public Map<String, Object> get(String id) {
        return withCurrentStatus(warnings.find(id));
    }

    public Map<String, Object> publicList() {
        var items = warnings.findAll().stream()
            .map(this::withCurrentStatus)
            .filter(item -> Set.of("Active", "Scheduled").contains(item.get("status")))
            .filter(item -> channelsContain(item, "WEBSITE"))
            .toList();
        return Map.of("items", items);
    }

    private boolean channelsContain(Map<String, Object> item, String channel) {
        Object value = item.get("channels");
        return value instanceof java.util.List<?> channels
            && channels.stream().anyMatch(entry -> channel.equalsIgnoreCase(String.valueOf(entry)));
    }

    public Map<String, Object> create(HazardWarningRequest request, PublicIdentity identity) {
        String id = "HW-" + Year.now().getValue() + "-" + UUID.randomUUID().toString().substring(0, 6).toUpperCase();
        Instant now = Instant.now();
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("type", request.type().trim());
        data.put("affectedAreas", request.affectedAreas());
        data.put("severity", request.severity().trim());
        data.put("title", request.title().trim());
        data.put("message", request.message().trim());
        data.put("validFrom", request.validFrom().toString());
        data.put("validUntil", request.validUntil().toString());
        data.put("channels", request.channels());
        data.put("status", scheduledStatus(request.validFrom(), request.validUntil()));
        data.put("createdAt", now.toString());
        data.put("issuedOn", now.toString());
        data.put("createdBy", identity.id());
        data.put("recipients", 0);
        data.put("auditTrail", java.util.List.of(audit("Warning created", identity, now)));
        var created = warnings.create(id, data);
        try {
            notifications.publishWarning(created);
        } catch (RuntimeException error) {
            System.err.println("Warning published, but notification fan-out failed: " + error.getMessage());
        }
        return created;
    }

    private String scheduledStatus(Instant validFrom, Instant validUntil) {
        Instant now = Instant.now();
        if (now.isBefore(validFrom)) return "Scheduled";
        if (now.isAfter(validUntil)) return "Expired";
        return "Active";
    }

    private Map<String, Object> withCurrentStatus(Map<String, Object> item) {
        var result = new LinkedHashMap<>(item);
        String status = String.valueOf(result.getOrDefault("status", ""));
        if (Set.of("Active", "Scheduled", "Expired").contains(status)) {
            Instant validFrom = parseInstant(result.get("validFrom"));
            Instant validUntil = parseInstant(result.get("validUntil"));
            if (validFrom != null && validUntil != null) result.put("status", scheduledStatus(validFrom, validUntil));
        }
        return result;
    }

    private Instant parseInstant(Object value) {
        if (value == null) return null;
        try {
            return Instant.parse(String.valueOf(value));
        } catch (RuntimeException error) {
            return null;
        }
    }

    public Map<String, Object> updateStatus(String id, String status, PublicIdentity identity) {
        return update(id, Map.of(
            "status", status,
            "updatedAt", Instant.now().toString()
        ), status.equals("Escalated") ? "Warning escalated" : "Warning cancelled", identity);
    }

    public Map<String, Object> update(String id, HazardWarningUpdateRequest request, PublicIdentity identity) {
        Map<String, Object> changes = new LinkedHashMap<>();
        changes.put("title", request.title().trim());
        changes.put("message", request.message().trim());
        changes.put("severity", request.severity().trim());
        changes.put("affectedAreas", request.affectedAreas());
        if (request.validUntil() != null) changes.put("validUntil", request.validUntil().toString());
        changes.put("updatedAt", Instant.now().toString());
        return update(id, changes, "Warning details updated", identity);
    }

    private Map<String, Object> update(String id, Map<String, Object> changes, String action, PublicIdentity identity) {
        Map<String, Object> current = warnings.find(id);
        var audit = new java.util.ArrayList<Map<String, Object>>();
        Object previous = current.get("auditTrail");
        if (previous instanceof java.util.List<?> entries) {
            for (Object entry : entries) {
                if (entry instanceof Map<?, ?> item) {
                    audit.add(new LinkedHashMap<>((Map<String, Object>) item));
                }
            }
        }
        audit.add(audit(action, identity, Instant.now()));
        changes.put("updatedBy", identity.id());
        changes.put("auditTrail", audit);
        return warnings.update(id, changes);
    }

    private Map<String, Object> audit(String action, PublicIdentity identity, Instant at) {
        String actor = identity.email() == null || identity.email().isBlank()
            ? identity.id()
            : identity.email();
        return Map.of("action", action, "at", at.toString(), "actor", actor);
    }
}
