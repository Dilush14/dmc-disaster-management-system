package lk.dmc.service;

import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import lk.dmc.repository.MonitoringDataRepository;
import lk.dmc.repository.StatisticalReportRepository;
import lk.dmc.security.PublicIdentity;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class StatisticalReportService {
    private final StatisticalReportRepository reportRepository;
    private final MonitoringService monitoring;
    private final MonitoringDataRepository data;

    public StatisticalReportService(StatisticalReportRepository reportRepository, MonitoringService monitoring,
                                    MonitoringDataRepository data) {
        this.reportRepository = reportRepository;
        this.monitoring = monitoring;
        this.data = data;
    }

    public Map<String, Object> generate(Map<String, Object> request, PublicIdentity identity) {
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
        List<Map<String, Object>> occupancy = data.findAll("shelterOccupancyRecords").stream()
            .filter(item -> districtMatches(item, district))
            .filter(item -> inDateRange(item, from, to, "recordedAt", "date", "createdAt")).toList();
        List<Map<String, Object>> distributions = data.findAll("resourceDistributions").stream()
            .filter(item -> districtMatches(item, district))
            .filter(item -> inDateRange(item, from, to, "distributedAt", "distributionTime", "createdAt")).toList();
        List<Map<String, Object>> reachedRecords = data.findAll("citizensReachedRecords").stream()
            .filter(item -> districtMatches(item, district))
            .filter(item -> inDateRange(item, from, to, "distributedAt", "date", "createdAt")).toList();

        var missing = new ArrayList<String>();
        if (sections.contains("Hazard Warnings") && warnings.isEmpty()) missing.add("hazard warning timeline records");
        if (sections.contains("Citizens Reached") && reachedRecords.isEmpty()) missing.add("citizens-reached records");
        if (sections.contains("Shelter Occupancy") && occupancy.isEmpty()) missing.add("shelter occupancy records");
        if (sections.contains("Resource Distribution") && distributions.isEmpty()) missing.add("resource distribution records");
        if (!missing.isEmpty()) throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY,
            "Report generation failed: missing " + String.join(" and ", missing) + ". Add or synchronize the required operational data, then retry.");
        if (warnings.isEmpty() && reports.isEmpty()) throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY,
            "Report generation failed: no hazard warning or report data is available for the selected district.");

        List<Map<String, Object>> timeline = warnings.stream().map(item -> Map.<String, Object>of(
            "title", value(item, "title"), "type", "Warning " + value(item, "status"),
            "date", value(item, "createdAt"))).toList();
        List<Map<String, Object>> reached = reachedRecords.stream().<Map<String, Object>>map(item -> {
            var record = new LinkedHashMap<String, Object>();
            record.put("label", value(item, "programName"));
            record.put("district", value(item, "district"));
            record.put("value", item.getOrDefault("citizensReached", 0));
            record.put("date", firstValue(item, "distributedAt", "date", "createdAt"));
            return record;
        }).toList();

        String id = "RPT-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
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
        report.put("shelterOccupancy", occupancy);
        report.put("resourceDistribution", distributions);
        report.put("verifiedReportCount", reports.stream().filter(item -> "VERIFIED".equalsIgnoreCase(value(item, "status"))).count());
        report.put("includeCharts", Boolean.TRUE.equals(request.get("includeCharts")));
        report.put("includeMaps", Boolean.TRUE.equals(request.get("includeMaps")));
        report.put("includeRawData", Boolean.TRUE.equals(request.get("includeRawData")));
        report.put("includeAppendix", Boolean.TRUE.equals(request.get("includeAppendix")));
        report.put("reportFormat", request.getOrDefault("reportFormat", "PDF"));
        report.put("status", "GENERATED");
        return reportRepository.create(id, report);
    }

    public Map<String, Object> get(String id) {
        return reportRepository.find(id);
    }

    public List<Map<String, Object>> list() {
        return reportRepository.findAll().stream()
            .sorted(Comparator.comparing((Map<String, Object> item) -> String.valueOf(item.getOrDefault("generatedOn", ""))).reversed())
            .toList();
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