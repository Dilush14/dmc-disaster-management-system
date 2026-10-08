package lk.dmc.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record StaffRegistrationRequest(
    @NotBlank @Size(max = 120) String name,
    @NotBlank @Pattern(regexp = "[+\\d\\s()-]{7,20}") String phone,
    @NotBlank @Pattern(regexp = "DMC_OFFICER|DISTRICT_OFFICER|RESPONSE_TEAM_MEMBER") String requestedRole
) {}
