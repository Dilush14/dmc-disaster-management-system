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
public class HazardReportRepository {
    private final FirebaseGateway firebase;
    public HazardReportRepository(FirebaseGateway firebase) {
        this.firebase = firebase;
    }
    public Map<String, Object> find(String id) {
        try {
            return firebase.firestore()
                .collection("hazardReports")
                .document(id)
                .get()
                .get(20, TimeUnit.SECONDS)
                .getData();
        }
        catch (InterruptedException error) {
            Thread.currentThread().interrupt();
            throw unavailable();
        }
        catch (ExecutionException | TimeoutException error) {
            throw unavailable();
        }
    }
    public List<Map<String, Object>> findByReporter(String uid) {
        try {
            return firebase.firestore().collection("hazardReports").whereEqualTo("reporterId", uid)
                .get().get(20, TimeUnit.SECONDS).getDocuments().stream().map(document -> document.getData()).toList();
        } catch (InterruptedException error) {
            Thread.currentThread().interrupt();
            throw unavailable();
        }
        catch (ExecutionException | TimeoutException error) {
            throw unavailable();
        }
    }
    public Map<String, Object> createIfAbsent(String id, Map<String, Object> data) {
        var db = firebase.firestore();
        var ref = db.collection("hazardReports").document(id);
        try {
            return db.runTransaction(transaction -> {
                var current = transaction.get(ref).get();
                if (current.exists())
                    return current.getData();
                transaction.create(ref, data); return data;
            }).get(20, TimeUnit.SECONDS);
        } catch (InterruptedException error) {
            Thread.currentThread().interrupt();
            throw unavailable();
        }
        catch (ExecutionException | TimeoutException error) {
            throw unavailable();
        }
    }
    private ResponseStatusException unavailable() {
        return new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Unable to access reports. Please try again.");
    }
}
