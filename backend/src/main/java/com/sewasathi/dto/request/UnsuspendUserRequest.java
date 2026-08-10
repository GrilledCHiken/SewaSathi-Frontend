package com.sewasathi.dto.request;

import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

/** An optional note added to the reinstatement email; the whole body may be absent. */
@Getter
@Setter
public class UnsuspendUserRequest {

    @Size(max = 500, message = "{validation.suspensionNote.tooLong}")
    private String note;
}
