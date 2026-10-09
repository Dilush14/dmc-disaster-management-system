package lk.dmc.repository;

import java.util.List;
import java.util.Map;
import java.util.concurrent.TimeUnit;
import lk.dmc.config.FirebaseGateway;
import org.springframework.stereotype.Repository;

@Repository
public class NotificationRepository {
    private final FirebaseGateway firebase;

    public NotificationRepository(FirebaseGateway firebase) {
        this.firebase = firebase;
    }

    public List<Map<String, Object>> findForUser(String userId) {
        try {
            return firebase.firestore().collection("notifications")
                .whereEqualTo("recipientId", userId)
                .get().get(20, TimeUnit.SECONDS).getDocuments().stream()
                .map(document -> withId(document.getId(), document.getData())).toList();
        } catch (Exception error) {
            throw new IllegalStateException("Unable to load notifications.", error);
        }
    }

    public Map<String, Object> createIfAbsent(String id, Map<String, Object> data) {
        var ref = firebase.firestore().collection("notifications").document(id);
        try {
            return firebase.firestore().runTransaction(transaction -> {
                var current = transaction.get(ref).get();
                if (current.exists()) return withId(id, current.getData());
                transaction.create(ref, data);
                return withId(id, data);
            }).get(20, TimeUnit.SECONDS);
        } catch (Exception error) {
            throw new IllegalStateException("Unable to save notification.", error);
        }
    }

    public Map<String, Object> markRead(String id, String userId) {
        var ref = firebase.firestore().collection("notifications").document(id);
        try {
            var document = ref.get().get(20, TimeUnit.SECONDS);
            if (!document.exists() || !userId.equals(document.getString("recipientId"))) return null;
            ref.update("readAt", java.time.Instant.now().toString()).get(20, TimeUnit.SECONDS);
            return withId(id, ref.get().get(20, TimeUnit.SECONDS).getData());
        } catch (Exception error) {
            throw new IllegalStateException("Unable to update notification.", error);
        }
    }

    private Map<String, Object> withId(String id, Map<String, Object> data) {
        var result = new java.util.LinkedHashMap<String, Object>(data);
        result.put("id", id);
        return result;
    }
}
