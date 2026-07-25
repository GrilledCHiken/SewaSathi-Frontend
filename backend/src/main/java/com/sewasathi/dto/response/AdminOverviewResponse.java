package com.sewasathi.dto.response;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class AdminOverviewResponse {
    private long totalUsers;
    private long totalWorkers;
    private long totalCustomers;
    private long pendingVerifications;
}
