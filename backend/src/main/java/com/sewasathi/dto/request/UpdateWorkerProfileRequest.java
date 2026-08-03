package com.sewasathi.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;

@Getter
@Setter
public class UpdateWorkerProfileRequest {

    @Size(max = 500)
    private String skills;

    @DecimalMin(value = "0", inclusive = true)
    private BigDecimal hourlyRate;

    @Size(max = 120)
    private String location;

    @Size(max = 255)
    private String address;

    @Size(max = 50)
    private String yearsOfExperience;

    @Size(max = 1000)
    private String bio;
}
