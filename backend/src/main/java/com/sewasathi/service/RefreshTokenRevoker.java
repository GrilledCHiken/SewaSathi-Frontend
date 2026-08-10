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
 * <p>{@link RefreshTokenService#rotate} revokes a compromised chain and then throws. Sharing
 * the caller's transaction would roll the revocation back with it, leaving the stolen token
 * working. A separate bean because {@code REQUIRES_NEW} is applied by Spring's proxy, which a
 * self-call would bypass.
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
