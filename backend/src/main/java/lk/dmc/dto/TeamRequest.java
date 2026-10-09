package lk.dmc.dto;

import jakarta.validation.constraints.*;
import java.util.List;

public record TeamRequest(
    @NotBlank @Size(max = 120) String name,
    @NotBlank @Pattern(regexp = "DMC|Sri Lanka Army|Navy|Police|Fire Service|Red Cross|NGO", message = "must be a supported agency") String agency,
    @NotBlank @Size(max = 60) String district,
    @NotNull @Min(1) @Max(500) Integer memberCount,
    @NotBlank @Size(max = 120) String leader,
    @NotBlank @Pattern(regexp = "^[0-9 +()-]{7,20}$", message = "must be a valid phone number") String contactNumber,
    @NotEmpty @Size(max = 10) List<@NotBlank @Pattern(regexp = "Boat Rescue|First Aid|Evacuation|Heavy Lifting",
        message = "must be a supported capability") String> capabilities
) {}
