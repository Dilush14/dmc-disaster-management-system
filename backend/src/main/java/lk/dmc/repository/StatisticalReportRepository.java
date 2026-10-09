package lk.dmc.repository;

import java.util.List;
import java.util.Map;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;
import lk.dmc.config.FirebaseGateway;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Repository;
import org.springframework.web.server.ResponseStatusException;

@Repository
public class StatisticalReportRepository {
    private static final String COLLECTION = "statisticalReports";
    private final FirebaseGateway firebase;

    public StatisticalReportRepository(FirebaseGateway firebase) {
        this.firebase = firebase;
    }

    public Map<String, Object> create(String id, Map<String, Object> report) {
        String reportId = java.util.Objects.requireNonNull(id, "id");
        Map<String, Object> reportData = java.util.Objects.requireNonNull(report, "report");
        try {
            firebase.firestore().collection(COLLECTION).document(reportId).create(reportData)
                .get(20, TimeUnit.SECONDS);
            var result = new java.util.LinkedHashMap<String, Object>(reportData);
            result.put("id", reportId);
            return result;
        } catch (InterruptedException error) {
            Thread.currentThread().interrupt();
            throw unavailable();
        } catch (ExecutionException | TimeoutException error) {
            throw unavailable();
        }
    }

    public Map<String, Object> find(String id) {
        String reportId = java.util.Objects.requireNonNull(id, "id");
        try {
            var document = firebase.firestore().collection(COLLECTION).document(reportId)
                .get().get(20, TimeUnit.SECONDS);
            if (!document.exists()) throw missing();
            var result = new java.util.LinkedHashMap<String, Object>(document.getData());
            result.put("id", document.getId());
            return result;
        } catch (InterruptedException error) {
            Thread.currentThread().interrupt();
            throw unavailable();
        } catch (ExecutionException | TimeoutException error) {
            throw unavailable();
        }
    }

    public List<Map<String, Object>> findAll() {
        try {
            return firebase.firestore().collection(COLLECTION).get()
                .get(20, TimeUnit.SECONDS).getDocuments().stream()
                .<Map<String, Object>>map(document -> {
                    var item = new java.util.LinkedHashMap<String, Object>(document.getData());
                    item.put("id", document.getId());
                    return item;
                }).toList();
        } catch (InterruptedException error) {
            Thread.currentThread().interrupt();
            throw unavailable();
        } catch (ExecutionException | TimeoutException error) {
            throw unavailable();
        }
    }

    private ResponseStatusException missing() {
        return new ResponseStatusException(HttpStatus.NOT_FOUND, "Statistical report was not found.");
    }

    private ResponseStatusException unavailable() {
        return new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
            "Unable to access statistical reports. Please try again.");
    }
}