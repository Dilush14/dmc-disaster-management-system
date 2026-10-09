package lk.dmc.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record EscalationRequest(
    @NotBlank @Size(max = 500) String note
) {}
