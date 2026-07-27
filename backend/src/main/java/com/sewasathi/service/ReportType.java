package com.sewasathi.service;

import lombok.Getter;

/**
 * The reports the admin console can generate (requirement #14).
 *
 * <p>An enum rather than a free-text parameter so a request can only ever name a template
 * that exists - the value goes into a classpath lookup, and an open string there would let a
 * caller probe the filesystem.
 */
@Getter
public enum ReportType {

    REVENUE("revenue", "Revenue by month and gateway", true),
    TASK_SUMMARY("task-summary", "Task volume by category", true),
    WORKER_PERFORMANCE("worker-performance", "Worker performance", false);

    /** Both the URL segment and the .jrxml file name under classpath:reports/. */
    private final String slug;
    private final String title;
    /** Whether the report narrows to a date window; the worker snapshot does not. */
    private final boolean dateRanged;

    ReportType(String slug, String title, boolean dateRanged) {
        this.slug = slug;
        this.title = title;
        this.dateRanged = dateRanged;
    }

    public static ReportType fromSlug(String slug) {
        for (ReportType type : values()) {
            if (type.slug.equalsIgnoreCase(slug)) {
                return type;
            }
        }
        throw new IllegalArgumentException("Unknown report: " + slug);
    }
}
