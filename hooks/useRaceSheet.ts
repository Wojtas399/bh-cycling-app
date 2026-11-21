import { useCallback, useState } from 'react';

import type { Race } from '@/lib/races';

export interface RaceSheetController {
  visible: boolean;
  race: Race | null;
  open: (race: Race) => void;
  close: () => void;
}

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
