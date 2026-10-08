package lk.dmc.config;

import java.io.IOException;
import java.io.FileInputStream;
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
        @Value("${app.firebase.storage-bucket}") String bucket,
        @Value("${GOOGLE_APPLICATION_CREDENTIALS:}") String credentialsPath) throws IOException {
        if (projectId.isBlank() || bucket.isBlank()) {
            throw new IllegalStateException("FIREBASE_PROJECT_ID and FIREBASE_STORAGE_BUCKET are required when Firebase is enabled.");
        }
        // GOOGLE_APPLICATION_CREDENTIALS points to a service-account JSON outside this repository.
        GoogleCredentials credentials;
        if (credentialsPath.isBlank())
            credentials = GoogleCredentials.getApplicationDefault();
        else {
            try (var stream = new FileInputStream(credentialsPath)) {
                credentials = GoogleCredentials.fromStream(stream);
            }
        }
        String normalizedBucket = bucket.trim()
            .replaceFirst("^gs://", "")
            .replaceAll("/+$", "");
        FirebaseOptions options = FirebaseOptions.builder()
            .setCredentials(credentials)
            .setProjectId(projectId).setStorageBucket(normalizedBucket).build();
        return FirebaseApp.initializeApp(options, "dmc-backend");
    }
}
