package com.sewasathi.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

/**
 * The reason an administrator is turning a worker's application down. Mandatory, because it is
 * shown to the applicant verbatim and is all they have to act on.
 */
@Getter
@Setter
public class RejectWorkerRequest {

    @NotBlank(message = "{validation.rejectionReason.required}")
    @Size(max = 500, message = "{validation.rejectionReason.tooLong}")
    private String reason;
}
