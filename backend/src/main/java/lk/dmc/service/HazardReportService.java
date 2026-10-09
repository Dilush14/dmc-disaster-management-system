package lk.dmc.service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.util.Comparator;
import java.util.HexFormat;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import lk.dmc.dto.HazardReportRequest;
import lk.dmc.repository.HazardReportRepository;
import lk.dmc.security.PublicIdentity;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

@Service
public class HazardReportService {
    private final HazardReportRepository reports;
    private final ReportPhotoStorage photos;
    public HazardReportService(HazardReportRepository reports, ReportPhotoStorage photos) {
        this.reports = reports;
        this.photos = photos;
    }
    public Map<String, Object> submit(HazardReportRequest request, MultipartFile file, PublicIdentity identity) {
        var photo = photos.validate(file);
        String id = "HR-" + hash((identity.id() + ":" + request.clientRequestId())
            .getBytes(StandardCharsets.UTF_8))
            .substring(0, 24)
            .toUpperCase();
        String fingerprint = hash((request.hazardType() + "\n" + request.description()
            .trim() + "\n" + request.latitude()
            + "\n" + request.longitude() + "\n" + request.dateTime()
            .toInstant() + "\n" + (photo == null ? "" : hash(photo.bytes())))
            .getBytes(StandardCharsets.UTF_8));
        var existing = reports.find(id);
        if (existing != null) {
            sameRequest(existing, fingerprint);
            return publicView(existing);
        }
        String path = photo == null ? null : "hazard-reports/" + id + "/" + UUID.randomUUID();
        if (photo != null)
            photos.upload(path, photo);
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("reportId", id);
        data.put("reporterId", identity.id());
        data.put("reporterRole", identity.role());
        data.put("hazardType", request.hazardType());
        data.put("description", request.description().trim());
        data.put("latitude", request.latitude()
            .doubleValue());
        data.put("longitude", request.longitude()
            .doubleValue());
        data.put("district", DistrictLocator.locate(request.latitude(), request.longitude()));
        data.put("dateTime", request.dateTime()
            .toInstant()
            .toString());
        data.put("submittedAt", Instant.now()
            .toString());
        data.put("status", "PENDING_VERIFICATION");
        data.put("reviewedAt", null);
        data.put("reviewedBy", null);
        data.put("rejectionReason", null);
        data.put("photoPath", path);
        data.put("photoUrl", path == null ? null : "/api/public/hazard-reports/" + id + "/photo");
        data.put("clientRequestId", request.clientRequestId());
        data.put("requestFingerprint", fingerprint);
        // The transaction prevents duplicate reports even across multiple server instances.
        // On an ambiguous database timeout retain the upload: the commit may have succeeded.
        var stored = reports.createIfAbsent(id, data);
        if (!Objects.equals(path, stored.get("photoPath")))
            photos.delete(path);
        sameRequest(stored, fingerprint);
        return publicView(stored);
    }
    public List<Map<String, Object>> mine(PublicIdentity identity) {
        return reports.findByReporter(identity.id()).stream()
            .sorted(Comparator.comparing((Map<String, Object> report) -> (String) report.get("submittedAt")).reversed())
            .map(this::publicView).toList();
    }
    public Map<String, Object> get(String id, PublicIdentity identity) {
        return publicView(owned(id, identity));
    }
    public List<Map<String, Object>> staffList() {
        return reports.findAll().stream()
            .sorted(Comparator.comparing(
                (Map<String, Object> report) -> String.valueOf(report.getOrDefault("submittedAt", "")))
                .reversed())
            .map(this::withDistrict)
            .toList();
    }
    public Map<String, Object> staffGet(String id) {
        var report = reports.find(id);
        if (report == null) throw missing();
        return publicView(withDistrict(report));
    }
    // Reports saved before districts were recorded only carry GPS; derive one so district filters still match them.
    private Map<String, Object> withDistrict(Map<String, Object> report) {
        if (report.get("district") != null) return report;
        String district = DistrictLocator.locate(report.get("latitude"), report.get("longitude"));
        if (district == null) return report;
        var result = new LinkedHashMap<>(report);
        result.put("district", district);
        return result;
    }
    public Map<String, Object> verify(String id, PublicIdentity identity) {
        return moderate(id, "VERIFIED", null, identity);
    }
    public Map<String, Object> reject(String id, String reason, PublicIdentity identity) {
        if (reason == null || reason.trim().isEmpty())
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "A rejection reason is required.");
        return moderate(id, "REJECTED", reason.trim(), identity);
    }
    public Map<String, Object> assign(String id, String team, PublicIdentity identity) {
        var report = reports.find(id);
        if (report == null) throw missing();
        return publicView(reports.update(id, Map.of(
            "assignedTeam", team.trim(),
            "assignedAt", Instant.now().toString(),
            "assignedBy", identity.id(),
            "status", "ASSIGNED"
        )));
    }
    private Map<String, Object> moderate(String id, String status, String reason, PublicIdentity identity) {
        var updates = new LinkedHashMap<String, Object>();
        updates.put("status", status);
        updates.put("reviewedAt", Instant.now().toString());
        updates.put("reviewedBy", identity.id());
        updates.put("rejectionReason", reason);
        return publicView(reports.update(id, updates));
    }
    public ReportPhotoStorage.Photo staffPhoto(String id) {
        var report = reports.find(id);
        if (report == null || report.get("photoPath") == null) throw missing();
        return photos.download((String) report.get("photoPath"));
    }
    public ReportPhotoStorage.Photo photo(String id, PublicIdentity identity) {
        var record = owned(id, identity);
        String path = (String) record.get("photoPath");
        if (path == null)
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Photo not found.");
        return photos.download(path);
    }
    private Map<String, Object> owned(String id, PublicIdentity identity) {
        if (!id.matches("HR-[A-F0-9]{24}"))
            throw missing();
        var report = reports.find(id);
        if (report == null || !identity.id().equals(report.get("reporterId")))
            throw missing();
        return report;
    }
    private ResponseStatusException missing() {
        return new ResponseStatusException(HttpStatus.NOT_FOUND, "Report not found.");
    }
    private void sameRequest(Map<String, Object> report, String fingerprint) {
        if (!fingerprint.equals(report.get("requestFingerprint")))
            throw new ResponseStatusException(HttpStatus.CONFLICT,
            "This submission ID was already used with different details. Start a new report.");
    }
    private Map<String, Object> publicView(Map<String, Object> report) {
        var result = new LinkedHashMap<>(report);
        result.remove("photoPath");
        result.remove("requestFingerprint");
        return result;
    }
    private String hash(byte[] bytes) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(bytes));
        }
        catch (NoSuchAlgorithmException error) {
            throw new IllegalStateException(error);
        }
    }
}
