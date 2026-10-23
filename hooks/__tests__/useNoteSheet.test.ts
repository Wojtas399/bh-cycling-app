import { useNoteSheet } from '../useNoteSheet';
import type { Note } from '@/lib/notes';
import { act, renderHook } from '@testing-library/react-native';

function note(overrides: Partial<Note>): Note {
  return {
    id: 1,
    name: 'Wolne',
    description: null,
    color: null,
    start: '2026-10-20',
    end: '2026-10-21',
    ...overrides,
  };
}

async function renderSheet(initial: Note[] | undefined) {
  return renderHook(
    ({ notes }: { notes: Note[] | undefined }) => useNoteSheet(notes),
    { initialProps: { notes: initial } },
  );
}

describe('useNoteSheet', () => {
  it('starts closed with no Note', async () => {
    const { result } = await renderSheet([note({ id: 1 })]);

    expect(result.current.visible).toBe(false);
    expect(result.current.note).toBeNull();
  });

  it('opens the Note with the given id', async () => {
    const camp = note({ id: 2, name: 'Obóz' });
    const { result } = await renderSheet([note({ id: 1 }), camp]);

    await act(async () => result.current.open(2));

    expect(result.current.visible).toBe(true);
    expect(result.current.note).toEqual(camp);
  });

  it('reads the open Note from fresh data', async () => {
    const { result, rerender } = await renderSheet([note({ id: 1 })]);

    await act(async () => result.current.open(1));
    await rerender({ notes: [note({ id: 1, name: 'Wolne!' })] });

    expect(result.current.note?.name).toBe('Wolne!');
  });

  it('closes on close, keeping the Note so the sheet can slide out', async () => {
    const { result } = await renderSheet([note({ id: 1 })]);

    await act(async () => result.current.open(1));
    await act(async () => result.current.close());

    expect(result.current.visible).toBe(false);
    expect(result.current.note?.id).toBe(1);
  });

  it('closes when the data becomes undefined and stays closed when it returns', async () => {
    const { result, rerender } = await renderSheet([note({ id: 1 })]);

    await act(async () => result.current.open(1));
    await rerender({ notes: undefined });

    expect(result.current.visible).toBe(false);

    await rerender({ notes: [note({ id: 1 })] });

    expect(result.current.visible).toBe(false);
  });

  it('closes when the Note is gone after a refetch', async () => {
    const { result, rerender } = await renderSheet([note({ id: 1 })]);

    await act(async () => result.current.open(1));
    await rerender({ notes: [note({ id: 2 })] });

    expect(result.current.visible).toBe(false);
  });
});
