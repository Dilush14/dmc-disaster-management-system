package lk.dmc.repository;

import com.google.api.core.ApiFuture;
import com.google.api.core.ApiFutures;
import com.google.cloud.firestore.*;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;
import lk.dmc.config.FirebaseGateway;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.function.Executable;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/** UC2 persistence: Firestore is fully mocked, so these tests never reach a live project. */
@DisplayName("UC2 FirestoreCoordinationStore")
class FirestoreCoordinationStoreTest {
    private Firestore db;
    private CollectionReference shelters;
    private DocumentReference shelterDoc;
    private FirestoreCoordinationStore store;

    @BeforeEach
    void setUp() {
        FirebaseGateway firebase = mock(FirebaseGateway.class);
        db = mock(Firestore.class);
        shelters = mock(CollectionReference.class);
        shelterDoc = mock(DocumentReference.class);
        when(firebase.firestore()).thenReturn(db);
        when(db.collection(CoordinationStore.SHELTERS)).thenReturn(shelters);
        when(shelters.document("SH-1")).thenReturn(shelterDoc);
        store = new FirestoreCoordinationStore(firebase);
    }

    @Test
    void shouldListDocumentsOfCollection() throws Exception {
        QuerySnapshot snapshot = mock(QuerySnapshot.class);
        QueryDocumentSnapshot doc = mock(QueryDocumentSnapshot.class);
        when(doc.getData()).thenReturn(Map.of("id", "SH-1", "capacity", 500L));
        when(snapshot.getDocuments()).thenReturn(List.of(doc));
        when(shelters.get()).thenReturn(ApiFutures.immediateFuture(snapshot));

        List<Map<String, Object>> rows = store.list(CoordinationStore.SHELTERS);

        assertEquals(1, rows.size());
        assertEquals(500L, rows.get(0).get("capacity"));
    }

    @Test
    void shouldFindDocumentById() {
        DocumentSnapshot snapshot = mock(DocumentSnapshot.class);
        when(snapshot.getData()).thenReturn(Map.of("id", "SH-1"));
        when(shelterDoc.get()).thenReturn(ApiFutures.immediateFuture(snapshot));

        assertEquals("SH-1", store.find(CoordinationStore.SHELTERS, "SH-1").get("id"));
    }

    @Test
    void shouldReturnServiceUnavailableWhenListFails() throws Exception {
        ApiFuture<QuerySnapshot> failed = failingFuture(new ExecutionException(new RuntimeException("network down")));
        when(shelters.get()).thenReturn(failed);

        assertUnavailable(() -> store.list(CoordinationStore.SHELTERS));
    }

    @Test
    void shouldReturnServiceUnavailableWhenFindTimesOut() throws Exception {
        ApiFuture<DocumentSnapshot> slow = failingFuture(new TimeoutException());
        when(shelterDoc.get()).thenReturn(slow);

        assertUnavailable(() -> store.find(CoordinationStore.SHELTERS, "SH-1"));
    }

    @Test
    void shouldRestoreInterruptFlagWhenReadInterrupted() throws Exception {
        ApiFuture<DocumentSnapshot> interrupted = failingFuture(new InterruptedException());
        when(shelterDoc.get()).thenReturn(interrupted);

        assertUnavailable(() -> store.find(CoordinationStore.SHELTERS, "SH-1"));
        assertTrue(Thread.interrupted(), "interrupt flag is restored (and cleared here)");
    }

    @Test
    @SuppressWarnings("unchecked")
    void shouldReadAndWriteInsideFirestoreTransaction() throws Exception {
        Transaction transaction = mock(Transaction.class);
        DocumentSnapshot snapshot = mock(DocumentSnapshot.class);
        when(snapshot.getData()).thenReturn(Map.of("id", "SH-1", "occupied", 200L));
        when(transaction.get(shelterDoc)).thenReturn(ApiFutures.immediateFuture(snapshot));
        when(db.runTransaction(any(Transaction.Function.class))).thenAnswer(call ->
            ApiFutures.immediateFuture(((Transaction.Function<Object>) call.getArgument(0)).updateCallback(transaction)));

        Object result = store.transaction(tx -> {
            Map<String, Object> row = tx.get(CoordinationStore.SHELTERS, "SH-1");
            tx.set(CoordinationStore.SHELTERS, "SH-1", Map.of("id", "SH-1", "occupied", 300L));
            return row.get("occupied");
        });

        assertEquals(200L, result);
        verify(transaction).set(shelterDoc, Map.<String, Object>of("id", "SH-1", "occupied", 300L));
    }

    @Test
    @SuppressWarnings("unchecked")
    void shouldPassBusinessRuleErrorsThroughUnchanged() throws Exception {
        ResponseStatusException conflict = new ResponseStatusException(HttpStatus.CONFLICT, "Insufficient stock for Water.");
        ApiFuture<Object> failed = failingFuture(new ExecutionException(conflict));
        when(db.runTransaction(any(Transaction.Function.class))).thenReturn(failed);

        ResponseStatusException error = assertThrows(ResponseStatusException.class, () -> store.transaction(tx -> null));

        assertSame(conflict, error);
    }

    @Test
    @SuppressWarnings("unchecked")
    void shouldNotConfirmTransactionWhenFirestoreCommitFails() throws Exception {
        ApiFuture<Object> failed = failingFuture(new ExecutionException(new IllegalStateException("ABORTED")));
        when(db.runTransaction(any(Transaction.Function.class))).thenReturn(failed);

        assertUnavailable(() -> store.transaction(tx -> "confirmed"));
    }

    @Test
    @SuppressWarnings("unchecked")
    void shouldNotConfirmTransactionWhenFirestoreTimesOut() throws Exception {
        ApiFuture<Object> slow = failingFuture(new TimeoutException());
        when(db.runTransaction(any(Transaction.Function.class))).thenReturn(slow);

        assertUnavailable(() -> store.transaction(tx -> "confirmed"));
    }

    @Test
    @SuppressWarnings("unchecked")
    void shouldNotConfirmTransactionWhenInterrupted() throws Exception {
        ApiFuture<Object> interrupted = failingFuture(new InterruptedException());
        when(db.runTransaction(any(Transaction.Function.class))).thenReturn(interrupted);

        assertUnavailable(() -> store.transaction(tx -> "confirmed"));
        assertTrue(Thread.interrupted());
    }

    @SuppressWarnings("unchecked")
    private static <T> ApiFuture<T> failingFuture(Exception failure) throws Exception {
        ApiFuture<T> future = mock(ApiFuture.class);
        when(future.get(20, TimeUnit.SECONDS)).thenThrow(failure);
        return future;
    }

    private static void assertUnavailable(Executable action) {
        ResponseStatusException error = assertThrows(ResponseStatusException.class, action);
        assertEquals(HttpStatus.SERVICE_UNAVAILABLE, error.getStatusCode());
        assertEquals("Unable to access shelter and resource records. Please try again.", error.getReason());
    }
}
