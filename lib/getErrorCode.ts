export function getErrorCode(e: unknown): string {
  if (typeof e !== 'object' || e === null || !('code' in e)) {
    return '';
  }

  return typeof e.code === 'string' ? e.code : '';
}
