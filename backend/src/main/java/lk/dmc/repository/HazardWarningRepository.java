package lk.dmc.repository;

import com.google.cloud.firestore.Query;
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
public class HazardWarningRepository {
    private static final String COLLECTION = "hazardWarnings";
    private final FirebaseGateway firebase;

    public HazardWarningRepository(FirebaseGateway firebase) {
        this.firebase = firebase;
    }

    public List<Map<String, Object>> findAll() {
        try {
            return firebase.firestore().collection(COLLECTION)
                .orderBy("createdAt", Query.Direction.DESCENDING)
                .get().get(20, TimeUnit.SECONDS).getDocuments().stream()
                .map(document -> withId(document.getId(), document.getData())).toList();
        } catch (InterruptedException error) {
            Thread.currentThread().interrupt();
            throw unavailable();
        } catch (ExecutionException | TimeoutException error) {
            throw unavailable();
        }
    }

    public Map<String, Object> find(String id) {
        try {
            var document = firebase.firestore().collection(COLLECTION).document(id)
                .get().get(20, TimeUnit.SECONDS);
            if (!document.exists()) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Warning was not found.");
            return withId(document.getId(), document.getData());
        } catch (InterruptedException error) {
            Thread.currentThread().interrupt();
            throw unavailable();
        } catch (ExecutionException | TimeoutException error) {
            throw unavailable();
        }
    }

    public Map<String, Object> create(String id, Map<String, Object> data) {
        try {
            firebase.firestore().collection(COLLECTION).document(id).create(data)
                .get(20, TimeUnit.SECONDS);
            return withId(id, data);
        } catch (InterruptedException error) {
            Thread.currentThread().interrupt();
            throw unavailable();
        } catch (ExecutionException | TimeoutException error) {
            throw unavailable();
        }
    }

    public Map<String, Object> update(String id, Map<String, Object> updates) {
        try {
            firebase.firestore().collection(COLLECTION).document(id).update(updates)
                .get(20, TimeUnit.SECONDS);
            return find(id);
        } catch (InterruptedException error) {
            Thread.currentThread().interrupt();
            throw unavailable();
        } catch (ExecutionException | TimeoutException error) {
            throw unavailable();
        }
    }

    private Map<String, Object> withId(String id, Map<String, Object> data) {
        var result = new java.util.LinkedHashMap<String, Object>(data);
        result.put("id", id);
        return result;
    }

    private ResponseStatusException unavailable() {
        return new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
            "Unable to access hazard warnings. Please try again.");
    }
}
