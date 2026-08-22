// PROTOTYPE — throwaway. Answers Ticket "Prototype: how a note renders in
// the today/tomorrow section" (.scratch/home-day-notes/issues/03-*.md).
// Real note data isn't wired up in lib/upcomingWorkouts.ts yet (that's a
// separate implementation issue) — this file stands in with fixed data so
// the three variants can be judged side by side without depending on
// whatever notes happen to exist on a live intervals.icu account today.

export interface MockWorkoutEntry {
  kind: 'workout';
  id: number;
  title: string;
  dayLabel: 'today' | 'tomorrow';
  durationSeconds: number;
}

export interface MockNoteEntry {
  kind: 'note';
  id: number;
  title: string;
  /** Raw Markdown from intervals.icu's `description` field, unrendered. */
  text: string;
  dayLabel: 'today' | 'tomorrow';
}

export type MockEntry = MockWorkoutEntry | MockNoteEntry;

const NUTRITION_NOTE = `! ODŻYWIANIE PRZED TRENINGIEM: !
- 80g węglowodanów 2h przed startem
- Elektrolity co 20 minut jazdy
- Kofeina 45 minut przed startem

! PO TRENINGU: !
- Białko + węglowodany w ciągu 30 minut
- Nawodnienie: 150% utraconej wagi ciała`;

export const mockEntries: MockEntry[] = [
  {
    kind: 'workout',
    id: 1,
    title: 'Threshold 2×20',
    dayLabel: 'today',
    durationSeconds: 5400,
  },
  {
    kind: 'note',
    id: 2,
    title: 'Bike check',
    text: 'Adjust saddle height by 2mm before the ride. Bring the mini pump — CO2 cartridges are out.',
    dayLabel: 'today',
  },
  {
    kind: 'note',
    id: 3,
    title: 'Wzornik żywienia na zgrupowanie',
    text: NUTRITION_NOTE,
    dayLabel: 'tomorrow',
  },
  {
    kind: 'note',
    id: 4,
    title: 'Pack list',
    text: 'Rain jacket — forecast says 70% chance of showers after 2pm.',
    dayLabel: 'tomorrow',
  },
  {
    kind: 'note',
    id: 5,
    title: 'Route change',
    text: 'Meet at the north gate instead of the usual spot — south car park is closed for resurfacing.',
    dayLabel: 'tomorrow',
  },
];
