package lk.dmc.exception;

import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.multipart.support.MissingServletRequestPartException;
import org.springframework.web.server.ResponseStatusException;

@RestControllerAdvice
public class ApiExceptionHandler {
    @ExceptionHandler(ResponseStatusException.class)
    ResponseEntity<?> status(ResponseStatusException error) {
        return ResponseEntity.status(error.getStatusCode())
            .body(Map.of("message", error.getReason() == null ? "Request failed." : error.getReason()));
    }
    @ExceptionHandler(MethodArgumentNotValidException.class)
    ResponseEntity<?> validation(MethodArgumentNotValidException error) {
        Map<String, String> fields = new LinkedHashMap<>();
        error.getBindingResult()
            .getFieldErrors()
            .forEach(field -> fields.put(field.getField(), field.getDefaultMessage()));
        return ResponseEntity.badRequest()
            .body(Map.of("message", "Please check the report details.", "errors", fields));
    }
    @ExceptionHandler({
        HttpMessageNotReadableException.class, MissingServletRequestPartException.class
    })
    ResponseEntity<?> malformed(Exception error) {
        return ResponseEntity.badRequest()
            .body(Map.of("message", "The request is incomplete or invalid."));
    }
    @ExceptionHandler(MaxUploadSizeExceededException.class)
    ResponseEntity<?> oversized(Exception error) {
        return ResponseEntity.status(413)
            .body(Map.of("message", "Photo must be no larger than 2 MB."));
    }
    @ExceptionHandler(Exception.class)
    ResponseEntity<?> unavailable(Exception error) {
        return ResponseEntity.status(503)
            .body(Map.of("message", "The service is temporarily unavailable. Please try again."));
    }
}
