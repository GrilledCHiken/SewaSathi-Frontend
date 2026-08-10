package com.sewasathi.dto.response;

import lombok.AllArgsConstructor;
import lombok.Getter;

/** Where to reach SewaSathi, served from configuration so the frontend has one source. */
@Getter
@AllArgsConstructor
public class PublicContactInfoResponse {

    private String supportEmail;

    /** Display form, e.g. "+977 1-444-5555". */
    private String phone;

    /** The same number as a tel: target, e.g. "+97714445555". */
    private String phoneHref;

    private String address;

    /** Staffed hours, e.g. "Mon-Fri, 9 AM - 6 PM NPT". */
    private String hours;

    private String careersEmail;
}
