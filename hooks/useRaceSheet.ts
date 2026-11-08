import { useCallback, useState } from 'react';

import type { Race } from '@/lib/races';

export interface RaceSheetController {
  visible: boolean;
  /** The Race last shown; stays set after closing so the sheet can slide out. */
  race: Race | null;
  open: (race: Race) => void;
  close: () => void;
}

/**
 * Which Race's Detail Sheet is open. It holds the Race it was opened with, so
 * it needs no fetch.
 */
export function useRaceSheet(): RaceSheetController {
  const [race, setRace] = useState<Race | null>(null);
  const [visible, setVisible] = useState(false);

  const open = useCallback((selected: Race) => {
    setRace(selected);
    setVisible(true);
  }, []);
  const close = useCallback(() => setVisible(false), []);

  return { visible, race, open, close };
}
