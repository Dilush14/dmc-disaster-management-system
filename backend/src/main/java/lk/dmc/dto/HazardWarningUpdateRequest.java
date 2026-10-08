package lk.dmc.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import java.time.Instant;
import java.util.List;

public record HazardWarningUpdateRequest(
    @NotBlank String title,
    @NotBlank String message,
    @NotBlank String severity,
    @NotEmpty List<String> affectedAreas,
    Instant validUntil
) {}
