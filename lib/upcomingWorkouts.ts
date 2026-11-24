import {
  type CalendarItem,
  type CalendarRange,
  type StoredCalendarItems,
  calendarItemKey,
  withItemStatuses,
} from './calendarItems';
import {
  type LocalDateString,
  addDays,
  fromLocalDateString,
  toLocalDateString,
} from './localDate';
import { type Note, notesOn } from './notes';

type DayLabel = 'today' | 'tomorrow';

export type UpcomingItem = (CalendarItem | { kind: 'note'; note: Note }) & {
  dayLabel: DayLabel;
};

export interface StoredUpcoming extends StoredCalendarItems {
  notes: Note[];
}

export function upcomingItemKey(item: UpcomingItem): string {
  return item.kind === 'note' ? `note-${item.note.id}` : calendarItemKey(item);
}

export function upcomingRange(today: LocalDateString): CalendarRange {
  return {
    oldest: today,
    newest: toLocalDateString(addDays(fromLocalDateString(today), 1)),
  };
}

export function getUpcomingItems(
  stored: StoredUpcoming,
  today: LocalDateString,
): UpcomingItem[] {
  const { newest: tomorrow } = upcomingRange(today);
  const itemsByDate = withItemStatuses(stored, today);

  return [
    ...onDay(itemsByDate[today] ?? [], notesOn(stored.notes, today), 'today'),
    ...onDay(
      (itemsByDate[tomorrow] ?? []).filter(item => item.kind !== 'activity'),
      stored.notes.filter(note => note.start === tomorrow),
      'tomorrow',
    ),
  ];
}

function onDay(
  items: CalendarItem[],
  notesInIdOrder: Note[],
  dayLabel: DayLabel,
): UpcomingItem[] {
  return [
    ...items.map(item => ({ ...item, dayLabel })),
    ...notesInIdOrder.map(note => ({ kind: 'note' as const, note, dayLabel })),
  ];
}
