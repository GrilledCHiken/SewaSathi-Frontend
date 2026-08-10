/**
 * Confirmation copy that two different screens have to word identically.
 *
 * Everything else is written inline next to the handler it guards, where it can be read
 * against the thing it warns about. These three are here only because the same question is
 * asked from two places — the cash claims on My Jobs and on Earnings, and Sign Out from both
 * the user menu and the worker approval gate — and two screens drifting apart on what a
 * confirmed cash payment means would be worse than the indirection.
 */

import { formatMoney } from "../components/tasks/taskUi";

/** Confirming closes the job and marks it paid in full. Nothing else can vouch for cash. */
export function cashReceivedConfirm({ title, amount }) {
  return {
    title: "Confirm you received this cash?",
    body: `You're saying the ${formatMoney(amount)} balance for "${title}" was handed to you. The job closes and counts as paid in full — this can't be undone.`,
    confirmLabel: "Yes, I received it",
    cancelLabel: "Go back",
    tone: "emerald",
  };
}

/** Rejecting clears the claim and sends the customer back to pay again. */
export function cashNotReceivedConfirm({ title, amount }) {
  return {
    title: "Say the cash never arrived?",
    body: `The customer says they paid you ${formatMoney(amount)} for "${title}". Rejecting the claim asks them to pay again, so only do this if the money really didn't reach you.`,
    confirmLabel: "I didn't receive it",
    cancelLabel: "Go back",
    tone: "danger",
  };
}

export function signOutConfirm() {
  return {
    title: "Sign out?",
    body: "You'll need to sign in again to get back to your dashboard.",
    confirmLabel: "Sign out",
    cancelLabel: "Stay signed in",
    tone: "danger",
  };
}
