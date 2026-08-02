package com.sewasathi.dto.response;

import lombok.Getter;

import java.math.BigDecimal;

/**
 * Just the two fields of a worker profile the public catalogue needs: what they say they do,
 * and what they charge. Loading whole profiles to read two columns would pull identity
 * document URLs and bios into memory for a page that must never see them.
 */
@Getter
public class WorkerSkillRow {

    private final String skills;
    private final BigDecimal hourlyRate;

    public WorkerSkillRow(String skills, BigDecimal hourlyRate) {
        this.skills = skills;
        this.hourlyRate = hourlyRate;
    }
}
