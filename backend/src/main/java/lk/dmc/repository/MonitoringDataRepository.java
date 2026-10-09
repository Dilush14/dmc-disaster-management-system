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
public class MonitoringDataRepository {
    private final FirebaseGateway firebase;

    public MonitoringDataRepository(FirebaseGateway firebase) {
        this.firebase = firebase;
    }

    public List<Map<String, Object>> findAll(String collection) {
        String collectionName = java.util.Objects.requireNonNull(collection, "collection");
        try {
            return firebase.firestore().collection(collectionName).get()
                .get(20, TimeUnit.SECONDS).getDocuments().stream()
                .<Map<String, Object>>map(document -> {
                    var item = new java.util.LinkedHashMap<String, Object>(document.getData());
                    item.putIfAbsent("id", document.getId());
                    return item;
                }).toList();
        } catch (InterruptedException error) {
            Thread.currentThread().interrupt();
            throw unavailable();
        } catch (ExecutionException | TimeoutException error) {
            throw unavailable();
        }
    }

    private ResponseStatusException unavailable() {
        return new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
            "Unable to access monitoring data. Please try again.");
    }
}