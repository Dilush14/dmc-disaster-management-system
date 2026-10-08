package lk.dmc.config;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
@ConditionalOnProperty(name = "app.cloudinary.enabled", havingValue = "true")
public class CloudinaryConfig {
    @Bean
    Cloudinary cloudinary(
        @Value("${app.cloudinary.cloud-name}") String cloudName,
        @Value("${app.cloudinary.api-key}") String apiKey,
        @Value("${app.cloudinary.api-secret}") String apiSecret) {
        if (cloudName.isBlank() || apiKey.isBlank() || apiSecret.isBlank())
            throw new IllegalStateException(
                "CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET are required when Cloudinary is enabled.");
        return new Cloudinary(ObjectUtils.asMap(
            "cloud_name", cloudName.trim(),
            "api_key", apiKey.trim(),
            "api_secret", apiSecret.trim()));
    }
}
