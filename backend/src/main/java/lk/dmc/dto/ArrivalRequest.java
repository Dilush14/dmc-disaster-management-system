package lk.dmc.dto;

import jakarta.validation.constraints.*;

/** expectedOccupancy is the shelter occupancy the officer last saw; a mismatch means the record changed in the meantime. */
public record ArrivalRequest(
    @NotNull @Min(0) Integer evacueesDelivered,
    @NotNull @Min(0) Integer expectedOccupancy
) {}
