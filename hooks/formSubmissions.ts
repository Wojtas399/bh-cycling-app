interface Submission {
  reset: () => void;
}

export function resetOtherSubmissions(
  starting: Submission,
  submissions: readonly Submission[],
): void {
  for (const submission of submissions) {
    if (submission !== starting) submission.reset();
  }
}
