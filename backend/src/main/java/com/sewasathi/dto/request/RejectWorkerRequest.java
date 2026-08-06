package com.sewasathi.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

/**
 * The reason an administrator is turning a worker's application down. Mandatory: the text is
 * emailed to the applicant verbatim and shown in the banner they get at their next sign-in, so
 * a rejection without one would leave them shut out with nothing to act on.
 */
@Getter
@Setter
public class RejectWorkerRequest {

    @NotBlank(message = "{validation.rejectionReason.required}")
    @Size(max = 500, message = "{validation.rejectionReason.tooLong}")
    private String reason;
}
