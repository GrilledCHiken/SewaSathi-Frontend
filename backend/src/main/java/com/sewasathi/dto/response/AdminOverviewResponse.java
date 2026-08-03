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
    /** Approved workers waiting on an admin to accept a replacement police clearance report. */
    private long pendingClearanceRenewals;
    /** Contact Us inquiries nobody has dealt with yet. */
    private long newInquiries;
}
