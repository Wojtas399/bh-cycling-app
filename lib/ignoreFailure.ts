const nothing = () => undefined;

export function ignoreFailure(promise: Promise<unknown>): Promise<void> {
  return promise.then(nothing, nothing);
}
