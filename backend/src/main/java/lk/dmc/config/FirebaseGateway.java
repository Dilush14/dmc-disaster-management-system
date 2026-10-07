package lk.dmc.config;

import com.google.cloud.firestore.Firestore;
import com.google.cloud.storage.Bucket;
import com.google.firebase.FirebaseApp;
import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.cloud.FirestoreClient;
import com.google.firebase.cloud.StorageClient;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

@Component
public class FirebaseGateway {
    private final ObjectProvider<FirebaseApp> apps;
    public FirebaseGateway(ObjectProvider<FirebaseApp> apps) {
        this.apps = apps;
    }
    private FirebaseApp app() {
        FirebaseApp app = apps.getIfAvailable();
        if (app == null)
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
            "Firebase is not configured on the server. Please contact the administrator.");
        return app;
    }
    public FirebaseAuth auth() {
        return FirebaseAuth.getInstance(app());
    }
    public Firestore firestore() {
        return FirestoreClient.getFirestore(app());
    }
    public Bucket bucket() {
        return StorageClient.getInstance(app()).bucket();
    }
}
