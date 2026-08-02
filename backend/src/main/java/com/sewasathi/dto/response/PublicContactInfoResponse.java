package com.sewasathi.dto.response;

import lombok.AllArgsConstructor;
import lombok.Getter;

/**
 * Where to reach SewaSathi, as configured rather than as hardcoded in the Contact page.
 *
 * <p>The same address and number appeared in four places across the frontend - the contact
 * cards and three FAQ answers - and could drift apart. Serving them from one place is what
 * stops that.
 */
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
