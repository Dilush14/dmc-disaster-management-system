package lk.dmc.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.util.List;

/** supportTeamIds and supportResources are optional help from other agencies and relief stock sent with the team. */
public record AssignTeamRequest(
    @NotBlank String teamId,
    @NotBlank String shelterId,
    @NotNull @Min(1) Integer expectedEvacuees,
    @NotBlank @Size(max = 200) String pickupLocation,
    @Size(max = 300) String notes,
    @Size(max = 5) List<@NotBlank String> supportTeamIds,
    @Size(max = 20) List<@Valid SupportResource> supportResources
) {
    public AssignTeamRequest(String teamId, String shelterId, Integer expectedEvacuees, String pickupLocation, String notes) {
        this(teamId, shelterId, expectedEvacuees, pickupLocation, notes, List.of(), List.of());
    }

    public record SupportResource(@NotBlank String resourceId, @NotNull @Min(1) Integer quantity) {}
}
