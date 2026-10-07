package lk.dmc;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(properties = "app.firebase.enabled=false")
@AutoConfigureMockMvc
class DmcApplicationTests {
    @Autowired MockMvc mvc;
    @Test void healthWorksWithoutFirebase() throws Exception {
        mvc.perform(get("/api/health")).andExpect(status().isOk()).andExpect(jsonPath("$.status").value("UP"));
    }
    @Test void unknownApiIsDenied() throws Exception {
        mvc.perform(get("/api/incidents")).andExpect(status().isUnauthorized());
    }
    @Test void disabledFirebaseCannotAcceptBearerTokens() throws Exception {
        mvc.perform(get("/api/public/profile").header("Authorization", "Bearer not-a-real-token"))
            .andExpect(status().isServiceUnavailable()).andExpect(jsonPath("$.message").exists());
    }
    @Test void configuredOriginIsAllowed() throws Exception {
        mvc.perform(options("/api/health").header("Origin", "http://localhost:5173")
            .header("Access-Control-Request-Method", "GET"))
            .andExpect(status().isOk()).andExpect(header().string("Access-Control-Allow-Origin", "http://localhost:5173"));
    }
    @Test void untrustedOriginIsRejected() throws Exception {
        mvc.perform(options("/api/health").header("Origin", "https://untrusted.example")
            .header("Access-Control-Request-Method", "GET"))
            .andExpect(status().isForbidden());
    }
}
