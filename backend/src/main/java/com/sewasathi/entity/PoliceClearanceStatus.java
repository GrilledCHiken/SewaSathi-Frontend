package com.sewasathi.entity;

/**
 * Where a worker's police clearance report stands against the six-month renewal rule.
 *
 * <p>Computed from the upload date rather than stored, so it cannot drift out of date with the
 * document it describes. See {@link WorkerProfile#getPoliceClearanceStatus()}.
 *
 * <p>Nothing in the platform is gated on this: an expired report warns the worker and shows up for
 * admins, but it does not stop them being hired or working.
 */
public enum PoliceClearanceStatus {

    /** No report on file at all — the worker never completed verification. */
    MISSING,

    /** On file and well inside its six months. */
    VALID,

    /** On file, but inside the last {@link WorkerProfile#POLICE_CLEARANCE_WARNING_DAYS} days. */
    EXPIRING_SOON,

    /** Older than six months. Needs replacing. */
    EXPIRED,

    /** A replacement has been uploaded and is waiting on an admin. The old one still stands. */
    RENEWAL_PENDING
}
