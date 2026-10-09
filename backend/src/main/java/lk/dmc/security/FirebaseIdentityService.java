package lk.dmc.security;

import com.google.firebase.auth.FirebaseAuthException;
import com.google.firebase.auth.FirebaseToken;
import lk.dmc.config.FirebaseGateway;
import lk.dmc.repository.PublicProfileRepository;
import lk.dmc.repository.StaffRegistrationRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class FirebaseIdentityService {
    private final FirebaseGateway firebase;
    private final PublicProfileRepository profiles;
    private final StaffRegistrationRepository staffRegistrations;
    public FirebaseIdentityService(FirebaseGateway firebase, PublicProfileRepository profiles,
                                   StaffRegistrationRepository staffRegistrations) {
        this.firebase = firebase;
        this.profiles = profiles;
        this.staffRegistrations = staffRegistrations;
    }
    public PublicIdentity verify(String token) {
        try {
            FirebaseToken decoded = firebase.auth().verifyIdToken(token, true);
            Object claim = decoded.getClaims().get("role");
            String role = claim instanceof String ? (String) claim : null;
            if (role == null) {
                var staff = staffRegistrations.find(decoded.getUid());
                if (staff != null && "ACTIVE".equals(staff.get("status"))) {
                    Object staffRole = staff.get("role");
                    if (staffRole instanceof String && java.util.List.of("DMC_OFFICER", "DISTRICT_OFFICER", "RESPONSE_TEAM_MEMBER").contains(staffRole)) {
                        role = (String) staffRole;
                    }
                }
            }
            if (role == null) {
                var profile = profiles.find(decoded.getUid());
                role = profile == null ? "CITIZEN" : (String) profile.get("role");
            }
            if (role == null)
                role = "DENIED";
            return new PublicIdentity(decoded.getUid(), decoded.getEmail(), decoded.getName(), role);
        } catch (FirebaseAuthException error) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Your session is invalid or expired. Please log in again.");
        }
    }
}
