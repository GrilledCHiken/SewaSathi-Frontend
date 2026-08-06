/**
 * One-shot, in-memory handover of the password from the worker signup form to the
 * verification screen that follows it.
 *
 * Worker signup has a second step that uploads documents to an authenticated endpoint, so
 * the new account has to be signed in the moment it is created — and creation now happens on
 * the OTP screen, one navigation away from where the password was typed.
 *
 * Deliberately not router state: react-router serialises that into `window.history.state`,
 * where a password would sit in the session history for anything on the page to read. A
 * module variable dies with the tab and never leaves memory. Losing it on refresh is fine:
 * VerifySignupOtp then routes the worker to /login instead, which is the same fallback it
 * already has for a failed auto sign-in.
 */

let stashed = null;

export function stashSignupPassword(password) {
  stashed = password;
}

/** Returns the stashed password and forgets it, so it cannot be read twice. */
export function takeSignupPassword() {
  const password = stashed;
  stashed = null;
  return password;
}

/**
 * The Google ID token, handed from the sign-in button to the screen that collects the phone
 * number a new account needs.
 *
 * Kept out of router state for the same reason as the password above, and with more force: an
 * ID token is a bearer assertion, and history.state persists it where any script on the page
 * can read it. Losing it on a refresh costs one click — the OTP page's own fallback — so
 * VerifySignupOtp's precedent applies here too.
 */
let stashedGoogleCredential = null;

export function stashGoogleCredential(credential) {
  stashedGoogleCredential = credential;
}

export function takeGoogleCredential() {
  const credential = stashedGoogleCredential;
  stashedGoogleCredential = null;
  return credential;
}
