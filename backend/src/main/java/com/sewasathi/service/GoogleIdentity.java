package com.sewasathi.service;

/**
 * A Google account, as far as we are willing to believe a verified ID token.
 *
 * @param subject   Google's own immutable id for the account ({@code sub}). Stored as
 *                  {@code users.provider_id}: an email address can be reassigned inside a
 *                  Google Workspace domain, this cannot.
 * @param email     lowercased, to match how accounts are keyed everywhere else
 * @param fullName  the {@code name} claim, or the local part of the email if Google withheld it
 * @param avatarUrl the {@code picture} claim; may be null
 */
public record GoogleIdentity(String subject, String email, String fullName, String avatarUrl) {
}
