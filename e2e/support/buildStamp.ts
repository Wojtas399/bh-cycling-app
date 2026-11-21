import { createHash } from 'node:crypto';

export interface SourceFile {
  path: string;
  content: string;
}

const NOT_BUNDLED_DIRS = [
  '.claude/',
  '.e2e/',
  '.github/',
  '.husky/',
  'docs/',
  'e2e/',
  'functions/',
  'scripts/',
  'test-utils/',
];

export function isBundleInput(path: string): boolean {
  return (
    !NOT_BUNDLED_DIRS.some(dir => path.startsWith(dir)) &&
    !path.includes('__tests__/') &&
    !path.endsWith('.md')
  );
}

export function buildStamp(files: readonly SourceFile[]): string {
  const hash = createHash('sha256');

  for (const file of [...files]
    .filter(file => isBundleInput(file.path))
    .sort((a, b) => (a.path < b.path ? -1 : 1))) {
    hash.update(file.path).update('\0').update(file.content).update('\0');
  }

  return hash.digest('hex');
}
