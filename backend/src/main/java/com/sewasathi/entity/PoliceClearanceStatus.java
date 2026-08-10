package com.sewasathi.entity;

/**
 * Where a worker's police clearance report stands against the six-month renewal rule. Computed
 * from the upload date rather than stored, so it cannot drift out of date with the document.
 * Nothing is gated on it: an expired report warns, but does not stop the worker being hired.
 */
public enum PoliceClearanceStatus {

    /** No report on file — the worker never completed verification. */
    MISSING,

    /** On file and inside its six months. */
    VALID,

    /** On file, but inside the last {@link WorkerProfile#POLICE_CLEARANCE_WARNING_DAYS} days. */
    EXPIRING_SOON,

    /** Older than six months. Needs replacing. */
    EXPIRED,

    /** A replacement has been uploaded and is waiting on an admin. The old one still stands. */
    RENEWAL_PENDING
}
