/**
 * One-shot, in-memory handover of the password from the worker signup form to the verification
 * screen, which is where the account is created and has to be signed in for the document
 * upload that follows.
 *
 * Deliberately not router state: react-router serialises that into `window.history.state`,
 * where a password would sit readable by anything on the page. A module variable dies with the
 * tab. Losing it on refresh is fine — VerifySignupOtp routes the worker to /login instead.
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
 * number a new account needs. Kept out of router state for the same reason as the password
 * above, and more so: an ID token is a bearer assertion.
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
