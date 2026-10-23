import { useCallback, useState } from 'react';

import type { Note } from '@/lib/notes';

export interface NoteSheetController {
  visible: boolean;
  /** The Note last shown; stays set after closing so the sheet can slide out. */
  note: Note | null;
  open: (id: number) => void;
  close: () => void;
}

/**
 * Which Note's Detail Sheet is open. The sheet holds only the Note's `id` and
 * reads the Note from `notes` on every render, so a refetch shows fresh text.
 * It closes when `notes` is `undefined` (a reload, a disconnect) or the Note
 * is gone after a refetch, and doesn't pop back open when it returns.
 */
export function useNoteSheet(notes: Note[] | undefined): NoteSheetController {
  const [openId, setOpenId] = useState<number | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [shown, setShown] = useState<Note | null>(null);

  const fresh =
    openId === null ? undefined : notes?.find(note => note.id === openId);

  if (isOpen && fresh === undefined) {
    setIsOpen(false);
  }

  if (fresh !== undefined && fresh !== shown) {
    setShown(fresh);
  }

  const open = useCallback((id: number) => {
    setOpenId(id);
    setIsOpen(true);
  }, []);
  const close = useCallback(() => setIsOpen(false), []);

  return { visible: isOpen, note: fresh ?? shown, open, close };
}
