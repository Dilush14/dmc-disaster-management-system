package lk.dmc.dto;

import jakarta.validation.constraints.*;

public record DistributionStatusRequest(@NotBlank @Pattern(regexp = "IN_TRANSIT|COMPLETED|CANCELLED") String status) {}
