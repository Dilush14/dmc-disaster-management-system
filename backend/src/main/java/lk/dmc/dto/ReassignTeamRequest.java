package lk.dmc.dto;

import jakarta.validation.constraints.NotBlank;

public record ReassignTeamRequest(
    @NotBlank String teamId
) {}
