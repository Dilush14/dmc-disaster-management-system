package lk.dmc.service;

import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import lk.dmc.repository.MonitoringDataRepository;
import org.springframework.stereotype.Service;

@Service
public class MonitoringService {
    private static final Set<String> ACTIVE_WARNING_STATES = Set.of("ACTIVE", "ESCALATED", "MONITORING");
    private final HazardWarningService warnings;
    private final HazardReportService reports;
    private final MonitoringDataRepository operationalData;

    public MonitoringService(HazardWarningService warnings, HazardReportService reports,
                             MonitoringDataRepository operationalData) {
        this.warnings = warnings;
        this.reports = reports;
        this.operationalData = operationalData;
    }

    public Map<String, Object> dashboard() {
        var allWarnings = warningItems();
        var allReports = reports.staffList();
        var shelters = operationalData.findAll("shelters");
        var teams = operationalData.findAll("rescueTeams");
        var summary = new LinkedHashMap<String, Object>();
        summary.put("activeWarnings", allWarnings.stream().filter(this::isActiveWarning).count());
        summary.put("verifiedReports", allReports.stream().filter(this::isVerifiedReport).count());
        summary.put("activeShelters", shelters.stream().filter(this::isActiveShelter).count());
        summary.put("deployedTeams", teams.stream().filter(this::isDeployedTeam).count());
        summary.put("affectedPopulation", sumNumeric(allWarnings, "affectedPopulation"));
        summary.put("lastUpdated", Instant.now().toString());
        summary.put("recentActivity", recentActivity(allWarnings, allReports));
        summary.put("hazardsByType", countBy(allWarnings, "type"));
        summary.put("reportsByStatus", reportStatuses(allReports));
        summary.put("dataStatus", Map.of(
            "sheltersAvailable", !shelters.isEmpty(), "teamsAvailable", !teams.isEmpty(),
            "reportsAvailable", !allReports.isEmpty(), "warningsAvailable", !allWarnings.isEmpty()));
        return summary;
    }

    public Map<String, Object> district(String district) {
        var allWarnings = warningItems().stream().filter(item -> matchesDistrict(item, district)).toList();
        var allReports = reports.staffList().stream().filter(item -> matchesDistrict(item, district)).toList();
        var shelters = operationalData.findAll("shelters").stream().filter(item -> matchesDistrict(item, district)).toList();
        var teams = operationalData.findAll("rescueTeams").stream().filter(item -> matchesDistrict(item, district)).toList();
        var resources = operationalData.findAll("reliefResources").stream().filter(item -> matchesDistrict(item, district)).toList();
        var result = new LinkedHashMap<String, Object>();
        result.put("district", district);
        result.put("summary", Map.of(
            "activeWarnings", allWarnings.stream().filter(this::isActiveWarning).count(),
            "verifiedReports", allReports.stream().filter(this::isVerifiedReport).count(),
            "activeShelters", shelters.stream().filter(this::isActiveShelter).count(),
            "affectedPopulation", sumNumeric(allWarnings, "affectedPopulation"),
            "deployedTeams", teams.stream().filter(this::isDeployedTeam).count()));
        result.put("incidents", incidents(allWarnings, allReports));
        result.put("hazardWarnings", allWarnings);
        result.put("hazardReports", allReports);
        result.put("shelters", shelters);
        result.put("teams", teams);
        result.put("resources", resources);
        result.put("statistics", Map.of(
            "gramaNiladhariDivisions", sumNumeric(allWarnings, "affectedGramaNiladhariDivisions"),
            "displacedPeople", sumNumeric(allWarnings, "displacedPeople"),
            "damagedHouses", sumNumeric(allWarnings, "damagedHouses"),
            "roadClosures", sumNumeric(allWarnings, "roadClosures"),
            "powerInterruptions", sumNumeric(allWarnings, "powerInterruptions"),
            "schoolsClosed", sumNumeric(allWarnings, "schoolsClosed")));
        result.put("warningHistory", allWarnings.stream().map(this::warningSummary).toList());
        result.put("resourceSummary", Map.of(
            "totalResources", resources.size(),
            "available", resources.stream().filter(item -> "AVAILABLE".equalsIgnoreCase(text(item, "status"))).count(),
            "dispatched", resources.stream().filter(item -> "DISPATCHED".equalsIgnoreCase(text(item, "status"))).count(),
            "critical", resources.stream().filter(item -> "CRITICAL".equalsIgnoreCase(text(item, "status"))).count()));
        result.put("dataStatus", Map.of("warningsAvailable", !allWarnings.isEmpty(), "reportsAvailable", !allReports.isEmpty(),
            "sheltersAvailable", !shelters.isEmpty(), "teamsAvailable", !teams.isEmpty(), "resourcesAvailable", !resources.isEmpty()));
        return result;
    }

    public Map<String, Object> realtime(String district) {
        var activeWarnings = warningItems().stream().filter(this::isActiveWarning)
            .filter(item -> matchesDistrict(item, district)).toList();
        var verifiedReports = reports.staffList().stream().filter(this::isVerifiedReport)
            .filter(item -> matchesDistrict(item, district)).toList();
        var shelters = operationalData.findAll("shelters").stream().filter(item -> matchesDistrict(item, district)).toList();
        var teams = operationalData.findAll("rescueTeams").stream().filter(item -> matchesDistrict(item, district)).toList();
        var items = new ArrayList<Map<String, Object>>();
        activeWarnings.forEach(item -> items.add(activeItem("Warning", item, "title", "severity")));
        verifiedReports.forEach(item -> items.add(activeItem("Report", item, "description", "status")));
        shelters.forEach(item -> items.add(activeItem("Shelter", item, "name", "status")));
        teams.forEach(item -> items.add(activeItem("Team", item, "name", "status")));
        return Map.of("district", district,
            "layers", List.of("Hazard Warnings", "Hazard Reports", "Shelters", "Deployed Teams", "Road Status", "Weather Radar", "River Levels", "District Boundaries"),
            "activeItems", items,
            "dataStatus", Map.of("sheltersAvailable", !shelters.isEmpty(), "teamsAvailable", !teams.isEmpty()));
    }

    public Map<String, Object> resources(String district) {
        var shelters = operationalData.findAll("shelters").stream().filter(item -> matchesDistrict(item, district)).toList();
        var occupancy = operationalData.findAll(lk.dmc.repository.CoordinationStore.OCCUPANCY_HISTORY).stream()
            .filter(item -> matchesDistrict(item, district)).toList();
        var teams = operationalData.findAll("rescueTeams").stream().filter(item -> matchesDistrict(item, district)).toList();
        var resources = operationalData.findAll("reliefResources").stream().filter(item -> matchesDistrict(item, district)).toList();
        var distributions = operationalData.findAll("resourceDistributions").stream().filter(item -> matchesDistrict(item, district)).toList();
        var infrastructure = operationalData.findAll("criticalInfrastructure").stream().filter(item -> matchesDistrict(item, district)).toList();
        var result = new LinkedHashMap<String, Object>();
        result.put("district", district);
        result.put("shelters", shelters);
        result.put("totalShelters", shelters.size());
        result.put("activeShelters", shelters.stream().filter(this::isActiveShelter).count());
        result.put("totalCapacity", sumNumeric(shelters, "capacity"));
        result.put("currentOccupancy", occupancy.isEmpty() ? sumNumeric(shelters, "occupied") : sumNumeric(occupancy, "occupancy"));
        result.put("statusBreakdown", countBy(shelters, "status"));
        result.put("teams", teams);
        result.put("resources", resources);
        result.put("distributions", distributions);
        result.put("criticalInfrastructure", infrastructure);
        result.put("dataStatus", Map.of("sheltersAvailable", !shelters.isEmpty(), "occupancyAvailable", !occupancy.isEmpty(),
            "teamsAvailable", !teams.isEmpty(), "resourcesAvailable", !resources.isEmpty(), "distributionsAvailable", !distributions.isEmpty(),
            "infrastructureAvailable", !infrastructure.isEmpty()));
        return result;
    }

    public List<Map<String, Object>> warnings() {
        return warnings.findAll();
    }

    public List<Map<String, Object>> hazardReports() {
        return reports.staffList();
    }

    public List<Map<String, Object>> occupancyHistory(String district) {
        return operationalData.findAll(lk.dmc.repository.CoordinationStore.OCCUPANCY_HISTORY).stream()
            .filter(item -> matchesDistrict(item, district)).toList();
    }

    public List<Map<String, Object>> resourceDistributions(String district) {
        return operationalData.findAll("resourceDistributions").stream()
            .filter(item -> matchesDistrict(item, district)).toList();
    }

    private List<Map<String, Object>> warningItems() {
        Object value = warnings.list("", "", "", "", 0, 100).get("items");
        if (!(value instanceof List<?> list)) return List.of();
        var result = new ArrayList<Map<String, Object>>();
        for (Object item : list) {
            if (item instanceof Map<?, ?> entry) {
                var normalized = new LinkedHashMap<String, Object>();
                entry.forEach((key, itemValue) -> normalized.put(String.valueOf(key), itemValue));
                result.add(normalized);
            }
        }
        return result;
    }

    private boolean isActiveWarning(Map<String, Object> item) {
        return ACTIVE_WARNING_STATES.contains(text(item, "status").toUpperCase());
    }

    private boolean isVerifiedReport(Map<String, Object> item) {
        return Set.of("VERIFIED", "ASSIGNED").contains(text(item, "status").toUpperCase());
    }

    private boolean isActiveShelter(Map<String, Object> item) {
        return Set.of("ACTIVE", "OPEN", "AVAILABLE").contains(text(item, "status").toUpperCase());
    }

    private boolean isDeployedTeam(Map<String, Object> item) {
        return Set.of("DEPLOYED", "ACTIVE", "ON_SCENE").contains(text(item, "status").toUpperCase());
    }

    private boolean matchesDistrict(Map<String, Object> item, String district) {
        if (district == null || district.isBlank() || "all districts".equalsIgnoreCase(district)) return true;
        for (String key : List.of("district", "destinationDistrict", "affectedAreas", "location")) {
            Object value = item.get(key);
            if (value instanceof Iterable<?> values) {
                for (Object entry : values) if (String.valueOf(entry).equalsIgnoreCase(district)) return true;
            } else if (value != null && String.valueOf(value).toLowerCase().contains(district.toLowerCase())) {
                return true;
            }
        }
        // Existing hazard reports currently carry coordinates but no district field; do not infer one.
        return false;
    }

    private List<Map<String, Object>> countBy(List<Map<String, Object>> items, String key) {
        return items.stream().collect(Collectors.groupingBy(item -> {
            String value = text(item, key);
            return value.isBlank() ? "Unspecified" : value;
        }, LinkedHashMap::new, Collectors.counting())).entrySet().stream()
            .map(entry -> Map.<String, Object>of("type", entry.getKey(), "status", entry.getKey(), "count", entry.getValue()))
            .toList();
    }

    private List<Map<String, Object>> reportStatuses(List<Map<String, Object>> items) {
        return List.of("VERIFIED", "PENDING_VERIFICATION", "REJECTED").stream().map(status -> Map.<String, Object>of(
            "status", status, "count", items.stream().filter(item -> status.equalsIgnoreCase(text(item, "status"))).count())).toList();
    }

    private List<Map<String, Object>> recentActivity(List<Map<String, Object>> warnings, List<Map<String, Object>> reports) {
        var activity = new ArrayList<Map<String, Object>>();
        warnings.forEach(item -> activity.add(Map.of("id", text(item, "id"), "type", "Warning " + text(item, "status"),
            "district", firstDistrict(item), "detail", text(item, "title"), "time", text(item, "createdAt"))));
        reports.forEach(item -> activity.add(Map.of("id", text(item, "reportId"), "type", "Hazard report " + text(item, "status"),
            "district", firstDistrict(item), "detail", text(item, "description"), "time", text(item, "submittedAt"))));
        return activity.stream().limit(8).toList();
    }

    private List<Map<String, Object>> incidents(List<Map<String, Object>> warnings, List<Map<String, Object>> reports) {
        var result = new ArrayList<Map<String, Object>>();
        warnings.forEach(item -> result.add(Map.of("type", text(item, "type"), "location", firstDistrict(item),
            "severity", text(item, "severity"), "status", text(item, "status"), "reportedOn", text(item, "createdAt"))));
        reports.forEach(item -> result.add(Map.of("type", text(item, "hazardType"), "location", text(item, "location"),
            "severity", text(item, "severity"), "status", text(item, "status"), "reportedOn", text(item, "submittedAt"))));
        return result;
    }

    private Map<String, Object> warningSummary(Map<String, Object> item) {
        return Map.of("title", text(item, "title"), "status", text(item, "status"), "date", text(item, "createdAt"));
    }

    private Map<String, Object> activeItem(String type, Map<String, Object> item, String labelKey, String statusKey) {
        return Map.of("id", text(item, "id"), "type", type, "label", text(item, labelKey),
            "location", firstDistrict(item), "severity", text(item, statusKey), "time", text(item, "createdAt"));
    }

    private String firstDistrict(Map<String, Object> item) {
        Object areas = item.get("affectedAreas");
        if (areas instanceof List<?> list && !list.isEmpty()) return String.valueOf(list.get(0));
        return text(item, "district");
    }

    private long sumNumeric(List<Map<String, Object>> items, String key) {
        return items.stream().map(item -> item.get(key)).filter(Number.class::isInstance)
            .map(Number.class::cast).mapToLong(value -> value.longValue()).sum();
    }

    private String text(Map<String, Object> item, String key) {
        Object value = item.get(key);
        return value == null ? "" : String.valueOf(value);
    }
}