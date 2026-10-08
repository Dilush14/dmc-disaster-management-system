package lk.dmc.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.time.LocalDate;
import java.util.List;

public record DistributionRequest(
    @NotEmpty @Size(max = 20) List<@Valid Item> items,
    @NotBlank String shelterId,
    @NotNull @FutureOrPresent LocalDate distributionDate,
    @NotBlank @Pattern(regexp = "DMC Vehicle|Military Transport|Partner Vehicle|Boat|Air Lift") String transportMethod,
    @Size(max = 300) String notes,
    @Min(0) Integer expectedPeople
) {
    public record Item(@NotBlank String resourceId, @NotNull @Min(1) Integer quantity) {}
}
