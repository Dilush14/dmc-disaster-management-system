package lk.dmc.config;

import java.io.IOException;
import com.google.auth.oauth2.GoogleCredentials;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
@ConditionalOnProperty(name = "app.firebase.enabled", havingValue = "true")
public class FirebaseConfig {
    @Bean(destroyMethod = "delete")
    FirebaseApp firebaseApp(@Value("${app.firebase.project-id}") String projectId,
                            @Value("${app.firebase.storage-bucket}") String bucket) throws IOException {
        if (projectId.isBlank() || bucket.isBlank()) {
            throw new IllegalStateException("FIREBASE_PROJECT_ID and FIREBASE_STORAGE_BUCKET are required when Firebase is enabled.");
        }
        // GOOGLE_APPLICATION_CREDENTIALS points to a service-account JSON outside this repository.
        FirebaseOptions options = FirebaseOptions.builder()
            .setCredentials(GoogleCredentials.getApplicationDefault())
            .setProjectId(projectId).setStorageBucket(bucket).build();
        return FirebaseApp.initializeApp(options, "dmc-backend");
    }
}
