package com.sewasathi.service;

import com.sewasathi.repository.RefreshTokenRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

/**
 * Revokes a token chain in a transaction of its own.
 *
 * <p>Exists because of an ordering trap: {@link RefreshTokenService#rotate} revokes a
 * compromised chain and then throws to reject the request. Sharing the caller's transaction
 * means that throw rolls the revocation straight back, so the stolen token keeps working -
 * the exact opposite of what reuse detection is for.
 *
 * <p>A separate bean rather than a method on {@code RefreshTokenService}: {@code REQUIRES_NEW}
 * is applied by Spring's proxy, and a service calling its own method never goes through that
 * proxy, so the annotation would be silently ignored.
 */
@Service
@RequiredArgsConstructor
public class RefreshTokenRevoker {

    private final RefreshTokenRepository refreshTokenRepository;

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public int revokeFamily(String familyId, LocalDateTime now) {
        return refreshTokenRepository.revokeFamily(familyId, now);
    }
}
