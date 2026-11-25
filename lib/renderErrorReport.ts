import { reportError } from './errorReporting';

function componentStackOf(error: unknown): string | undefined {
  if (typeof error !== 'object' || error === null) return undefined;

  if (!('componentStack' in error)) return undefined;

  return typeof error.componentStack === 'string'
    ? error.componentStack
    : undefined;
}

export function reportOnFirstLayout(error: unknown): () => void {
  let reported = false;

  return () => {
    if (reported) return;

    reported = true;
    reportError(error, { componentStack: componentStackOf(error) });
  };
}
