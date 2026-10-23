import { useNoteTitle } from '../useNoteTitle';
import type { Note } from '@/lib/notes';
import { renderHook } from '@testing-library/react-native';

jest.mock('react-i18next', () => ({
  useTranslation: (_ns: unknown, options?: { keyPrefix?: string }) => ({
    t: (key: string) =>
      options?.keyPrefix === 'note' && key === 'untitled' ? 'Notatka' : key,
  }),
}));

function note(name: string | null): Note {
  return {
    id: 1,
    name,
    description: null,
    color: null,
    start: '2026-10-20',
    end: '2026-10-21',
  };
}

describe('useNoteTitle', () => {
  it('titles a Note by its name', async () => {
    const { result } = await renderHook(() => useNoteTitle());

    expect(result.current(note('Wolne'))).toBe('Wolne');
  });

  it('titles a Note without a name "Notatka"', async () => {
    const { result } = await renderHook(() => useNoteTitle());

    expect(result.current(note(null))).toBe('Notatka');
  });
});
