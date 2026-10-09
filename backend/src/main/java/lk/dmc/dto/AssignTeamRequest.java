package lk.dmc.dto;

import jakarta.validation.constraints.*;

public record AssignTeamRequest(
    @NotBlank String teamId,
    @NotBlank String shelterId,
    @NotNull @Min(1) Integer expectedEvacuees,
    @NotBlank @Size(max = 200) String pickupLocation,
    @Size(max = 300) String notes
) {}
