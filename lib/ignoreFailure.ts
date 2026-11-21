const nothing = () => undefined;

export function ignoreFailure(work: () => unknown): Promise<void> {
  return new Promise(settle => settle(work())).then(nothing, nothing);
}
