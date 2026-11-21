export function getErrorCode(e: unknown): string {
  return (e as { code?: string } | null | undefined)?.code ?? '';
}
