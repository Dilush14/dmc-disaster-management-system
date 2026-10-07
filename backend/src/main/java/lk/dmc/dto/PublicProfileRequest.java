package lk.dmc.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record PublicProfileRequest(
    @NotBlank @Size(max = 120) String name,
    @NotBlank @Pattern(regexp = "[+0-9 ()-]{7,20}") String phone,
    @NotBlank @Pattern(regexp = "CITIZEN|COMMUNITY_VOLUNTEER") String role
) {}
