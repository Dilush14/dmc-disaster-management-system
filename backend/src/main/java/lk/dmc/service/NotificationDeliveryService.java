package lk.dmc.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class NotificationDeliveryService {
    private final ObjectMapper json;
    private final HttpClient http = HttpClient.newHttpClient();
    private final boolean emailEnabled;
    private final String emailApiKey;
    private final String emailSender;
    private final boolean smsEnabled;
    private final String smsAccountSid;
    private final String smsAuthToken;
    private final String smsFrom;

    public NotificationDeliveryService(
        ObjectMapper json,
        @Value("${app.notifications.email.enabled:false}") boolean emailEnabled,
        @Value("${app.notifications.email.api-key:}") String emailApiKey,
        @Value("${app.notifications.email.sender:}") String emailSender,
        @Value("${app.notifications.sms.enabled:false}") boolean smsEnabled,
        @Value("${app.notifications.sms.account-sid:}") String smsAccountSid,
        @Value("${app.notifications.sms.auth-token:}") String smsAuthToken,
        @Value("${app.notifications.sms.from:}") String smsFrom
    ) {
        this.json = json;
        this.emailEnabled = emailEnabled;
        this.emailApiKey = emailApiKey;
        this.emailSender = emailSender;
        this.smsEnabled = smsEnabled;
        this.smsAccountSid = smsAccountSid;
        this.smsAuthToken = smsAuthToken;
        this.smsFrom = smsFrom;
    }

    public void deliver(Map<String, Object> warning, Map<String, Object> profile) {
        Object channels = warning.get("channels");
        if (hasChannel(channels, "EMAIL") && emailEnabled && valid(profile.get("email")) && !emailApiKey.isBlank()) {
            try { sendEmail(warning, String.valueOf(profile.get("email"))); }
            catch (Exception error) { System.err.println("Warning email delivery failed: " + error.getMessage()); }
        }
        if (hasChannel(channels, "SMS") && smsEnabled && valid(profile.get("phone"))
            && !smsAccountSid.isBlank() && !smsAuthToken.isBlank() && !smsFrom.isBlank()) {
            try { sendSms(warning, String.valueOf(profile.get("phone"))); }
            catch (Exception error) { System.err.println("Warning SMS delivery failed: " + error.getMessage()); }
        }
    }

    private void sendEmail(Map<String, Object> warning, String recipient) throws Exception {
        String body = json.writeValueAsString(Map.of(
            "sender", Map.of("email", emailSender, "name", "DMC Sri Lanka"),
            "to", new Object[] { Map.of("email", recipient) },
            "subject", warning.get("title"),
            "textContent", warning.get("message")
        ));
        request("https://api.brevo.com/v3/smtp/email", body, Map.of("api-key", emailApiKey));
    }

    private void sendSms(Map<String, Object> warning, String recipient) throws Exception {
        String form = "To=" + encode(recipient) + "&From=" + encode(smsFrom)
            + "&Body=" + encode(String.valueOf(warning.get("title")) + ": " + warning.get("message"));
        String credentials = Base64.getEncoder().encodeToString(
            (smsAccountSid + ":" + smsAuthToken).getBytes(StandardCharsets.UTF_8));
        request("https://api.twilio.com/2010-04-01/Accounts/" + smsAccountSid + "/Messages.json",
            form, Map.of("Authorization", "Basic " + credentials, "Content-Type", "application/x-www-form-urlencoded"));
    }

    private void request(String url, String body, Map<String, String> headers) throws Exception {
        var builder = HttpRequest.newBuilder(URI.create(url))
            .POST(HttpRequest.BodyPublishers.ofString(body));
        headers.forEach(builder::header);
        var response = http.send(builder.build(), HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() / 100 != 2) throw new IllegalStateException("provider returned " + response.statusCode());
    }

    private boolean hasChannel(Object value, String channel) {
        return value instanceof java.util.List<?> values
            && values.stream().anyMatch(item -> channel.equalsIgnoreCase(String.valueOf(item)));
    }

    private boolean valid(Object value) {
        return value != null && !String.valueOf(value).isBlank();
    }

    private String encode(String value) {
        return java.net.URLEncoder.encode(value, StandardCharsets.UTF_8);
    }
}
