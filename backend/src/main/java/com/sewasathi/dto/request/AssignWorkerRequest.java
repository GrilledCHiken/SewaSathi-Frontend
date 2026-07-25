package com.sewasathi.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class AssignWorkerRequest {

    @NotNull
    private Long workerId;
}
