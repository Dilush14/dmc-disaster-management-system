package lk.dmc.service;

import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;
import lk.dmc.repository.CoordinationStore;
import lk.dmc.repository.StatisticalReportRepository;
import lk.dmc.security.PublicIdentity;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class StatisticalReportService {
    private final StatisticalReportRepository reportRepository;
    private final MonitoringService monitoring;
    private final CoordinationStore coordination;

    public StatisticalReportService(StatisticalReportRepository reportRepository, MonitoringService monitoring,
                                    CoordinationStore coordination) {
        this.reportRepository = reportRepository;
        this.monitoring = monitoring;
        this.coordination = coordination;
    }

    public Map<String, Object> generate(Map<String, Object> request, PublicIdentity identity) {
        Map<String, Object> report = compile(request, identity);
        String id = "RPT-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        report.put("id", id);
        report.put("status", "GENERATED");
        return reportRepository.create(id, report);
    }

    public Map<String, Object> preview(Map<String, Object> request, PublicIdentity identity) {
        Map<String, Object> report = compile(request, identity);
        report.put("id", "PREVIEW");
        report.put("status", "PREVIEW");
        return report;
    }

    private Map<String, Object> compile(Map<String, Object> request, PublicIdentity identity) {
        String reportType = required(request, "reportType");
        String district = required(request, "district");
        LocalDate from = date(request, "dateFrom");
        LocalDate to = date(request, "dateTo");
        if (to.isBefore(from)) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Report end date must be on or after its start date.");
        List<String> sections = strings(request.get("selectedSections"));
        if (sections.isEmpty()) throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY, "Select at least one report section.");

        List<Map<String, Object>> warnings = monitoring.warnings().stream().filter(item -> districtMatches(item, district))
            .filter(item -> inDateRange(item, from, to, "createdAt", "issuedOn", "validFrom")).toList();
        List<Map<String, Object>> reports = monitoring.hazardReports().stream().filter(item -> districtMatches(item, district))
            .filter(item -> inDateRange(item, from, to, "submittedAt", "dateTime")).toList();
        List<Map<String, Object>> shelters = coordination.list(CoordinationStore.SHELTERS);
        List<Map<String, Object>> occupancy = occupancyRecords(shelters, district, from, to);
        List<Map<String, Object>> distributions = coordination.list(CoordinationStore.DISTRIBUTIONS).stream()
            .filter(item -> districtMatches(item, district))
            .filter(item -> inDateRange(item, from, to, "distributionDate", "distributedAt", "createdAt")).toList();
        List<Map<String, Object>> reachedRecords = coordination.list("citizensReachedRecords").stream()
            .filter(item -> districtMatches(item, district))
            .filter(item -> inDateRange(item, from, to, "distributedAt", "distributionDate", "date", "createdAt")).toList();
        boolean reachedDerivedFromDistributions = reachedRecords.isEmpty();
        if (reachedRecords.isEmpty()) {
            reachedRecords = distributions.stream()
                .filter(item -> "COMPLETED".equalsIgnoreCase(value(item, "status")))
                .filter(item -> item.get("expectedPeople") instanceof Number count && count.longValue() > 0)
                .toList();
        }

        List<Map<String, Object>> timeline = new ArrayList<>();
        warnings.forEach(item -> timeline.add(Map.of(
            "title", value(item, "title"), "type", "Warning " + value(item, "status"),
            "date", firstValue(item, "createdAt", "issuedOn", "validFrom"))));
        reports.forEach(item -> timeline.add(Map.of(
            "title", value(item, "description"), "type", "Hazard report " + value(item, "status"),
            "date", firstValue(item, "submittedAt", "dateTime"))));
        timeline.sort(Comparator.comparing(item -> String.valueOf(item.getOrDefault("date", ""))));

        List<Map<String, Object>> reached = reachedRecords.stream().<Map<String, Object>>map(item -> {
            var record = new LinkedHashMap<String, Object>();
            record.put("label", firstValue(item, "programName", "shelterName", "name"));
            record.put("district", value(item, "district"));
            record.put("value", item.getOrDefault("citizensReached", item.getOrDefault("expectedPeople", 0)));
            record.put("date", firstValue(item, "distributedAt", "distributionDate", "date", "createdAt"));
            if (reachedDerivedFromDistributions)
                record.put("basis", "Expected people on a completed distribution record");
            return record;
        }).collect(java.util.stream.Collectors.toCollection(ArrayList::new));
        // People who received hazard warnings were also reached, not just relief recipients.
        warnings.stream().filter(item -> item.get("recipients") instanceof Number count && count.longValue() > 0)
            .forEach(item -> {
                var record = new LinkedHashMap<String, Object>();
                record.put("label", value(item, "title"));
                record.put("district", String.join(", ", strings(item.get("affectedAreas"))));
                record.put("value", item.get("recipients"));
                record.put("date", firstValue(item, "createdAt", "issuedOn", "validFrom"));
                record.put("basis", "Citizens notified of a hazard warning");
                reached.add(record);
            });

        var report = new LinkedHashMap<String, Object>();
        report.put("reportName", reportType);
        report.put("reportType", reportType);
        report.put("district", district);
        report.put("dateFrom", from.toString());
        report.put("dateTo", to.toString());
        report.put("period", from + " to " + to);
        report.put("selectedSections", sections);
        report.put("generatedOn", Instant.now().toString());
        report.put("generatedBy", identity.name() == null || identity.name().isBlank() ? identity.email() : identity.name());
        report.put("generatedById", identity.id());
        report.put("alertTimeline", timeline);
        report.put("citizensReached", reached);
        report.put("citizensReachedTotal", reached.stream().map(item -> item.get("value"))
            .filter(Number.class::isInstance).map(Number.class::cast).mapToLong(number -> number.longValue()).sum());
        report.put("shelterOccupancy", occupancy);
        report.put("resourceDistribution", distributions);
        report.put("verifiedReportCount", reports.stream().filter(item -> "VERIFIED".equalsIgnoreCase(value(item, "status"))).count());
        report.put("hazardReportCount", reports.size());
        report.put("hazardWarningCount", warnings.size());
        report.put("includeCharts", Boolean.TRUE.equals(request.get("includeCharts")));
        report.put("includeMaps", Boolean.TRUE.equals(request.get("includeMaps")));
        report.put("includeRawData", Boolean.TRUE.equals(request.get("includeRawData")));
        report.put("includeAppendix", Boolean.TRUE.equals(request.get("includeAppendix")));
        report.put("reportFormat", request.getOrDefault("reportFormat", "PDF"));
        return report;
    }

    public Map<String, Object> get(String id) {
        return reportRepository.find(id);
    }

    public List<Map<String, Object>> list() {
        return reportRepository.findAll().stream()
            .sorted(Comparator.comparing((Map<String, Object> item) -> String.valueOf(item.getOrDefault("generatedOn", ""))).reversed())
            .toList();
    }

    private List<Map<String, Object>> occupancyRecords(List<Map<String, Object>> shelters, String district,
                                                        LocalDate from, LocalDate to) {
        Map<String, Map<String, Object>> shelterById = shelters.stream().collect(Collectors.toMap(
            item -> value(item, "id"), item -> item, (first, second) -> first, HashMap::new));
        List<Map<String, Object>> history = coordination.list(CoordinationStore.OCCUPANCY_HISTORY).stream()
            .filter(item -> inDateRange(item, from, to, "recordedAt"))
            .filter(item -> {
                Map<String, Object> shelter = shelterById.get(value(item, "shelterId"));
                return shelter != null && districtMatches(shelter, district);
            })
            .map(item -> occupancyView(item, shelterById.get(value(item, "shelterId")), true))
            .toList();
        if (!history.isEmpty()) return history;

        return shelters.stream()
            .filter(item -> districtMatches(item, district))
            .filter(item -> inDateRange(item, from, to, "updatedAt"))
            .map(item -> occupancyView(item, item, false))
            .toList();
    }

    private Map<String, Object> occupancyView(Map<String, Object> record, Map<String, Object> shelter, boolean historical) {
        var view = new LinkedHashMap<String, Object>();
        view.put("shelterId", value(shelter, "id"));
        view.put("shelterName", value(shelter, "name"));
        view.put("district", value(shelter, "district"));
        view.put("occupancy", record.getOrDefault("occupied", 0));
        view.put("previousOccupancy", record.getOrDefault("previousOccupied", 0));
        view.put("capacity", record.getOrDefault("capacity", shelter.getOrDefault("capacity", 0)));
        view.put("recordedAt", firstValue(record, "recordedAt", "updatedAt"));
        view.put("recordType", historical ? "Occupancy history" : "Current shelter record");
        return view;
    }

    private String required(Map<String, Object> data, String field) {
        Object value = data.get(field);
        if (value == null || String.valueOf(value).isBlank())
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Field '" + field + "' is required.");
        return String.valueOf(value).trim();
    }

    private LocalDate date(Map<String, Object> data, String field) {
        try {
            return LocalDate.parse(required(data, field));
        } catch (java.time.format.DateTimeParseException error) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Field '" + field + "' must be a valid ISO date.");
        }
    }

    private List<String> strings(Object value) {
        if (!(value instanceof List<?> list)) return List.of();
        return list.stream().filter(String.class::isInstance).map(String.class::cast).map(section -> section.trim())
            .filter(item -> !item.isBlank()).distinct().toList();
    }

    private boolean districtMatches(Map<String, Object> item, String district) {
        if (district.equalsIgnoreCase("All Districts")) return true;
        Object value = item.get("district");
        if (value == null) value = item.get("affectedAreas");
        if (value == null) value = item.get("location");
        if (value instanceof Iterable<?> values) {
            for (Object entry : values) if (String.valueOf(entry).equalsIgnoreCase(district)) return true;
            return false;
        }
        return value != null && String.valueOf(value).toLowerCase().contains(district.toLowerCase());
    }

    private String value(Map<String, Object> item, String key) {
        Object value = item.get(key);
        return value == null ? "" : String.valueOf(value);
    }

    private String firstValue(Map<String, Object> item, String... keys) {
        for (String key : keys) {
            String value = value(item, key);
            if (!value.isBlank()) return value;
        }
        return "";
    }

    private boolean inDateRange(Map<String, Object> item, LocalDate from, LocalDate to, String... dateFields) {
        String raw = "";
        for (String field : dateFields) {
            raw = value(item, field);
            if (!raw.isBlank()) break;
        }
        if (raw.isBlank()) return false;
        try {
            LocalDate recordDate = LocalDate.parse(raw.substring(0, Math.min(raw.length(), 10)));
            return !recordDate.isBefore(from) && !recordDate.isAfter(to);
        } catch (java.time.format.DateTimeParseException error) {
            return false;
        }
    }
}