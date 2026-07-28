package com.sewasathi.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ContactMessageRequest {

    @NotBlank(message = "{validation.fullName.required}")
    @Size(max = 150, message = "{validation.fullName.tooLong}")
    private String name;

    @NotBlank(message = "{validation.email.required}")
    @Email(message = "{validation.email.invalid}")
    private String email;

    @NotBlank(message = "{validation.subject.required}")
    @Size(max = 100, message = "{validation.subject.tooLong}")
    private String subject;

    @NotBlank(message = "{validation.message.required}")
    @Size(max = 2000, message = "{validation.message.tooLong}")
    private String message;
}
