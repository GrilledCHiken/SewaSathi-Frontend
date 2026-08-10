package com.sewasathi.config;

import lombok.Getter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
@Getter
public class ContactProperties {

    @Value("${app.contact.support-email:support@sewasathi.com}")
    private String supportEmail;

    @Value("${app.contact.phone:+977 1-444-5555}")
    private String phone;

    /** The dialable form of {@link #phone}, kept separate so the display format stays free. */
    @Value("${app.contact.phone-href:+97714445555}")
    private String phoneHref;

    @Value("${app.contact.address:Kathmandu, Nepal}")
    private String address;

    @Value("${app.contact.hours:Mon-Fri, 9 AM - 6 PM NPT}")
    private String hours;

    @Value("${app.contact.careers-email:careers@sewasathi.com}")
    private String careersEmail;
}
