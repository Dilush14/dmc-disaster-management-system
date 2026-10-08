package lk.dmc.dto;

import jakarta.validation.constraints.*;
import java.util.List;

public record ShelterRequest(
    @NotBlank @Size(max = 120) String name,
    @NotBlank @Size(max = 60) String district,
    @NotBlank @Size(max = 200) String address,
    @NotBlank @Size(max = 60) String shelterType,
    @Size(max = 120) String managingOrganization,
    @Size(max = 120) String contactPerson,
    @Pattern(regexp = "^$|^[0-9 +()-]{7,20}$", message = "must be a valid phone number") String contactNumber,
    @NotNull @Min(1) @Max(100000) Integer capacity,
    @NotNull Boolean active,
    @Size(max = 20) List<@NotBlank @Size(max = 60) String> facilities
) {}
