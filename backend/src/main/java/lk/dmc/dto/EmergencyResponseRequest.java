package lk.dmc.dto;

import jakarta.validation.constraints.*;
import java.util.List;

public record EmergencyResponseRequest(
    @NotBlank @Pattern(regexp = "FLOOD|LANDSLIDE|CYCLONE|DROUGHT|TSUNAMI", message = "must be a supported hazard type") String hazardType,
    @NotBlank @Size(max = 60) String district,
    @NotBlank @Size(max = 120) String title,
    @Size(max = 20) List<@NotBlank @Size(max = 80) String> affectedAreas
) {}
