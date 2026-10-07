/**
 * One-shot flag set by the delete-account flow just before signing out, so the
 * sign-in screen (the only reader, via `useSignIn`) can tell the user their
 * account was deleted. Deliberately module-level: it must outlive the screens
 * that are unmounted by the sign-out.
 */
let accountDeleted = false;

export function markAccountDeleted(): void {
  accountDeleted = true;
}

/** Returns whether an account was just deleted, and resets the flag. */
export function consumeAccountDeleted(): boolean {
  const value = accountDeleted;

  accountDeleted = false;

  return value;
}
