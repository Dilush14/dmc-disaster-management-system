package lk.dmc.config;

import java.util.Arrays;
import java.util.List;
import java.util.Map;
import com.fasterxml.jackson.databind.ObjectMapper;
import lk.dmc.security.FirebaseAuthenticationFilter;
import lk.dmc.security.FirebaseIdentityService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

@Configuration
public class SecurityConfig {
    @Bean
    SecurityFilterChain securityFilterChain(HttpSecurity http, FirebaseIdentityService identities, ObjectMapper json) throws Exception {
        return http
            .cors(cors -> {})
            // API is stateless and does not accept cookie/session credentials.
            .csrf(csrf -> csrf.disable())
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .formLogin(form -> form.disable())
            .httpBasic(basic -> basic.disable())
            .addFilterBefore(new FirebaseAuthenticationFilter(identities, json), UsernamePasswordAuthenticationFilter.class)
            .exceptionHandling(errors -> errors
                .authenticationEntryPoint((request, response, error) -> {
            response.setStatus(401); response.setContentType("application/json");
                    json.writeValue(response.getOutputStream(), Map.of("message", "Please log in to continue."));
        })
                .accessDeniedHandler((request, response, error) -> {
            response.setStatus(403); response.setContentType("application/json");
            json.writeValue(response.getOutputStream(), Map.of("message",
                request.getRequestURI().startsWith("/api/staff/")
                    ? "A DMC Officer, District Officer or Response Team Member account is required."
                    : "This account cannot access public reporting."));
        }))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers(HttpMethod.GET, "/api/health").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/staff/registration").authenticated()
                .requestMatchers("/api/staff/**").hasAnyRole("DMC_OFFICER", "DISTRICT_OFFICER", "RESPONSE_TEAM_MEMBER")
                .requestMatchers("/api/public/**").hasAnyRole("CITIZEN", "COMMUNITY_VOLUNTEER")
                .anyRequest().denyAll())
            .build();
    }

    @Bean
    CorsConfigurationSource corsConfigurationSource(@Value("${app.cors.allowed-origins}") String origins) {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(Arrays.stream(origins.split(",")).map(String::trim).toList());
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "OPTIONS"));
        config.setAllowedHeaders(List.of("Authorization", "Content-Type"));
        config.setAllowCredentials(false);
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/api/**", config);
        return source;
    }
}
