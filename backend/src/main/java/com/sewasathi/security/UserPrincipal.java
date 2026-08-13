package com.sewasathi.security;

import com.sewasathi.entity.User;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;
import java.util.List;

public class UserPrincipal implements UserDetails {

    /**
     * Pinned rather than left to the compiler: Spring Security writes the principal into the
     * HTTP session, so a generated id would change whenever this class does and every session
     * live at deploy time would fail to deserialise.
     */
    private static final long serialVersionUID = 1L;

    private final User user;

    public UserPrincipal(User user) {
        this.user = user;
    }

    public User getUser() {
        return user;
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return List.of(new SimpleGrantedAuthority("ROLE_" + user.getRole().name()));
    }

    /**
     * Empty rather than null for a Google-only account. Spring Security's password paths - the
     * admin console's form login among them - are not written for a null here, and an empty
     * string is the right answer anyway: no input can BCrypt-match it, so the password route
     * stays closed for exactly the accounts that never had one.
     */
    @Override
    public String getPassword() {
        String hash = user.getPasswordHash();
        return hash != null ? hash : "";
    }

    @Override
    public String getUsername() {
        return user.getEmail();
    }
}
