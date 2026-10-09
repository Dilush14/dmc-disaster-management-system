package lk.dmc.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record TeamAvailabilityRequest(
    @NotBlank @Pattern(regexp = "AVAILABLE|UNAVAILABLE|COMM_FAILURE", message = "must be AVAILABLE, UNAVAILABLE or COMM_FAILURE") String status
) {}
