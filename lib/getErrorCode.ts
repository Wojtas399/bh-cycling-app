/** Returns the `code` of a Firebase-style error, or '' when there is none. */
export function getErrorCode(e: unknown): string {
  return (e as { code?: string } | null | undefined)?.code ?? '';
}
