package lk.dmc.repository;

import com.google.cloud.firestore.DocumentSnapshot;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;
import java.util.function.Function;
import lk.dmc.config.FirebaseGateway;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Repository;
import org.springframework.web.server.ResponseStatusException;

@Repository
@ConditionalOnProperty(name = "app.firebase.enabled", havingValue = "true")
public class FirestoreCoordinationStore implements CoordinationStore {
    private final FirebaseGateway firebase;
    public FirestoreCoordinationStore(FirebaseGateway firebase) {
        this.firebase = firebase;
    }
    @Override
    public List<Map<String, Object>> list(String collection) {
        try {
            return firebase.firestore().collection(collection).get().get(20, TimeUnit.SECONDS)
                .getDocuments().stream().map(DocumentSnapshot::getData).toList();
        } catch (InterruptedException error) {
            Thread.currentThread().interrupt();
            throw unavailable();
        } catch (ExecutionException | TimeoutException error) {
            throw unavailable();
        }
    }
    @Override
    public Map<String, Object> find(String collection, String id) {
        try {
            return firebase.firestore().collection(collection).document(id).get().get(20, TimeUnit.SECONDS).getData();
        } catch (InterruptedException error) {
            Thread.currentThread().interrupt();
            throw unavailable();
        } catch (ExecutionException | TimeoutException error) {
            throw unavailable();
        }
    }
    @Override
    public <T> T transaction(Function<Tx, T> work) {
        var db = firebase.firestore();
        try {
            return db.runTransaction(transaction -> work.apply(new Tx() {
                public Map<String, Object> get(String collection, String id) {
                    try {
                        return transaction.get(db.collection(collection).document(id)).get().getData();
                    } catch (InterruptedException | ExecutionException error) {
                        throw new IllegalStateException(error);
                    }
                }
                public void set(String collection, String id, Map<String, Object> data) {
                    transaction.set(db.collection(collection).document(id), data);
                }
            })).get(20, TimeUnit.SECONDS);
        } catch (InterruptedException error) {
            Thread.currentThread().interrupt();
            throw unavailable();
        } catch (ExecutionException error) {
            if (error.getCause() instanceof ResponseStatusException status) throw status;
            throw unavailable();
        } catch (TimeoutException error) {
            throw unavailable();
        }
    }
    private ResponseStatusException unavailable() {
        return new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Unable to access shelter and resource records. Please try again.");
    }
}
