package lk.dmc.repository;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Repository;

/** Local development store used when Firebase is disabled. Data resets on restart and starts empty. */
@Repository
@ConditionalOnProperty(name = "app.firebase.enabled", havingValue = "false", matchIfMissing = true)
public class InMemoryCoordinationStore implements CoordinationStore {
    private final Map<String, Map<String, Map<String, Object>>> data = new HashMap<>();

    @Override
    public synchronized List<Map<String, Object>> list(String collection) {
        return new ArrayList<>(data.getOrDefault(collection, Map.of()).values().stream().map(LinkedHashMap::new).toList());
    }
    @Override
    public synchronized Map<String, Object> find(String collection, String id) {
        var row = data.getOrDefault(collection, Map.of()).get(id);
        return row == null ? null : new LinkedHashMap<>(row);
    }
    @Override
    public synchronized <T> T transaction(Function<Tx, T> work) {
        Map<String, Map<String, Object>> pending = new LinkedHashMap<>();
        T result = work.apply(new Tx() {
            public Map<String, Object> get(String collection, String id) {
                return find(collection, id);
            }
            public void set(String collection, String id, Map<String, Object> row) {
                pending.put(collection + "/" + id, new LinkedHashMap<>(row));
            }
        });
        // Commit only after the work succeeded, mirroring Firestore transaction rollback.
        pending.forEach((key, row) -> {
            int slash = key.indexOf('/');
            data.computeIfAbsent(key.substring(0, slash), ignored -> new LinkedHashMap<>()).put(key.substring(slash + 1), row);
        });
        return result;
    }
}
