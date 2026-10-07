package lk.dmc.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.List;
import java.util.Map;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;
import org.springframework.web.server.ResponseStatusException;

public class FirebaseAuthenticationFilter extends OncePerRequestFilter {
    private final FirebaseIdentityService identities;
    private final ObjectMapper json;
    public FirebaseAuthenticationFilter(FirebaseIdentityService identities, ObjectMapper json) {
        this.identities = identities; this.json = json;
    }
    @Override protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getRequestURI().substring(request.getContextPath().length());
        return !path.startsWith("/api/public/") || "OPTIONS".equals(request.getMethod());
    }
    @Override protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
        throws ServletException, IOException {
        String header = request.getHeader("Authorization");
        if (header == null) { chain.doFilter(request, response); return; }
        try {
            if (!header.startsWith("Bearer ") || header.length() <= 7)
                throw new ResponseStatusException(org.springframework.http.HttpStatus.UNAUTHORIZED, "A valid bearer token is required.");
            PublicIdentity identity = identities.verify(header.substring(7));
            var authentication = new UsernamePasswordAuthenticationToken(identity, null,
                List.of(new SimpleGrantedAuthority("ROLE_" + identity.role())));
            SecurityContextHolder.getContext().setAuthentication(authentication);
        } catch (ResponseStatusException error) {
            response.setStatus(error.getStatusCode().value());
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            json.writeValue(response.getOutputStream(), Map.of("message", error.getReason() == null ? "Unable to authenticate." : error.getReason()));
            return;
        } catch (RuntimeException error) {
            response.setStatus(503); response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            json.writeValue(response.getOutputStream(), Map.of("message", "Authentication is temporarily unavailable. Please try again."));
            return;
        }
        chain.doFilter(request, response);
    }
}
