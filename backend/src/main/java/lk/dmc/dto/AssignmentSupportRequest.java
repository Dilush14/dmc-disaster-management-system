package lk.dmc.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.util.List;

/** Extra teams and relief stock added to an assignment that is assigned or already dispatched. */
public record AssignmentSupportRequest(
    @Size(max = 5) List<@NotBlank String> supportTeamIds,
    @Size(max = 20) List<AssignTeamRequest.@Valid SupportResource> supportResources
) {}
