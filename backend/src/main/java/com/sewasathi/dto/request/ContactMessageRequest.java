package com.sewasathi.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ContactMessageRequest {

    @NotBlank
    @Size(max = 150)
    private String name;

    @NotBlank
    @Email
    private String email;

    @NotBlank
    @Size(max = 100)
    private String subject;

    @NotBlank
    @Size(max = 2000)
    private String message;
}
