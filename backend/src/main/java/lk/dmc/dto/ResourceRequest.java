package lk.dmc.dto;

import jakarta.validation.constraints.*;

public record ResourceRequest(
    @NotBlank @Size(max = 120) String name,
    @NotBlank @Pattern(regexp = "Food & Water|Medical Supplies|Relief Items|Equipment") String category,
    @NotBlank @Size(max = 30) String unit,
    @NotNull @Min(0) Integer totalQuantity,
    @NotNull @Min(0) Integer available,
    @NotNull @Min(0) Integer lowStockThreshold
) {}
