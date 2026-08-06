package com.sewasathi.dto.request;

import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

/**
 * An optional note added to the reinstatement email. Unlike the suspension reason this is
 * not required - "your account has been restored" already stands on its own - so the whole
 * body may be absent.
 */
@Getter
@Setter
public class UnsuspendUserRequest {

    @Size(max = 500, message = "{validation.suspensionNote.tooLong}")
    private String note;
}
