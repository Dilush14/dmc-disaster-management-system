package lk.dmc.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import java.time.Instant;
import java.util.List;

public record HazardWarningRequest(
    @NotBlank String type,
    @NotEmpty List<String> affectedAreas,
    @NotBlank String severity,
    @NotBlank String title,
    @NotBlank String message,
    @NotNull Instant validFrom,
    @NotNull Instant validUntil,
    @NotEmpty List<String> channels
) {}
