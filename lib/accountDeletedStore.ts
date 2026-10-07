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
