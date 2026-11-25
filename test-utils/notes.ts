import type { Note } from '@/lib/notes';

export function note(overrides: Partial<Note> = {}): Note {
  return {
    id: 1,
    name: 'Wolne',
    description: null,
    color: null,
    start: '2026-10-07',
    end: '2026-10-08',
    ...overrides,
  };
}
