// Deliberate lint error for #365, reverted in the next commit.
import { useState } from 'react';

export function lintCanary(flag: boolean) {
  if (flag) {
    useState(0);
  }
}
