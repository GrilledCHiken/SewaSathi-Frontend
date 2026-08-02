package com.sewasathi.config;

import lombok.Getter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * The support contact details published on the Contact page.
 *
 * <p>Every value carries the address that was previously hardcoded in {@code Contact.jsx} as its
 * default, so the application still starts and answers correctly with no {@code app.contact.*}
 * configuration at all. Deployments that have a real support desk override them.
 *
 * <p>Follows the {@code @Value}-with-default style used by {@link AdminBootstrap} rather than
 * introducing {@code @ConfigurationProperties} for one small group of keys.
 */
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
