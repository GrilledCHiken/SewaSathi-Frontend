package com.sewasathi.repository;

import com.sewasathi.entity.KnownDevice;
import com.sewasathi.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface KnownDeviceRepository extends JpaRepository<KnownDevice, Long> {

    Optional<KnownDevice> findByUserAndFingerprint(User user, String fingerprint);

    boolean existsByUserAndFingerprint(User user, String fingerprint);

    List<KnownDevice> findByUserOrderByLastSeenAtDesc(User user);

    /** True for an account that has never signed in anywhere - its first device is not "new". */
    boolean existsByUser(User user);
}
