package lk.dmc.dto;

import jakarta.validation.constraints.*;

/** expectedOccupancy is the value the officer last saw; a mismatch means the record changed in the meantime. */
public record OccupancyUpdateRequest(
    @NotNull @Min(0) Integer occupied,
    @NotNull @Min(0) Integer expectedOccupancy
) {}
