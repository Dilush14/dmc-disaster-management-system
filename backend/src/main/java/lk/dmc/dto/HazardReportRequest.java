package lk.dmc.dto;

import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.OffsetDateTime;

public record HazardReportRequest(
    @NotBlank @Pattern(regexp = "FLOOD|LANDSLIDE|ROAD_BLOCKAGE|FALLEN_TREE|FIRE|BUILDING_DAMAGE|OTHER") String hazardType,
    @NotBlank @Size(max = 500) String description,
    @NotNull @DecimalMin("-90") @DecimalMax("90") BigDecimal latitude,
    @NotNull @DecimalMin("-180") @DecimalMax("180") BigDecimal longitude,
    @NotNull @PastOrPresent OffsetDateTime dateTime,
    @NotBlank @Pattern(regexp = "[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}") String clientRequestId
) {}
