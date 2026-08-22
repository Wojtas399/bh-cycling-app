// PROTOTYPE — throwaway. Three structurally different takes on how a Note
// Entry renders in the Home today/tomorrow list, answering Ticket
// "Prototype: how a note renders in the today/tomorrow section"
// (.scratch/home-day-notes/issues/03-note-card-visual-design.md).
//
// A — separate card, full text always shown, plain wrapped text.
// B — separate card, line-clamped with tap-to-expand into a bottom sheet.
// C — merged into the WorkoutTile when possible, light markdown-ish
//     formatting, line-clamped with no expand affordance.
//
// None of this is meant to survive past the design decision — see
// prototype/UI.md's capture step.
import { useState } from 'react';
import { Modal, Pressable } from 'react-native';

import type { MockEntry, MockNoteEntry } from './notePrototypeMockData';
import Box from '@/components/Box';
import Text from '@/components/Text';
import { formatDuration } from '@/lib/formatDuration';

function EntryDayLabel({ dayLabel }: { dayLabel: 'today' | 'tomorrow' }) {
  return (
    <Text variant="body-s-regular" color="textSecondary" marginLeft="sm">
      {dayLabel}
    </Text>
  );
}

function MockWorkoutTile({
  entry,
}: {
  entry: Extract<MockEntry, { kind: 'workout' }>;
}) {
  return (
    <Box backgroundColor="bgSecondary" borderRadius="lg" padding="base">
      <Box
        flexDirection="row"
        justifyContent="space-between"
        alignItems="center"
      >
        <Text variant="body-l-semibold" numberOfLines={1} style={{ flex: 1 }}>
          {entry.title}
        </Text>
        <EntryDayLabel dayLabel={entry.dayLabel} />
      </Box>
      <Text variant="body-s-regular" color="textSecondary" marginTop="xs">
        {formatDuration(entry.durationSeconds)}
      </Text>
    </Box>
  );
}

// ---------------------------------------------------------------------------
// Variant A — separate card, full text always, plain wrap
// ---------------------------------------------------------------------------

function NoteCardFull({ note }: { note: MockNoteEntry }) {
  return (
    <Box backgroundColor="bgSecondary" borderRadius="lg" padding="base">
      <Box
        flexDirection="row"
        justifyContent="space-between"
        alignItems="center"
      >
        <Text variant="body-l-semibold" numberOfLines={1} style={{ flex: 1 }}>
          {note.title}
        </Text>
        <EntryDayLabel dayLabel={note.dayLabel} />
      </Box>
      <Text variant="body-s-regular" color="textSecondary" marginTop="sm">
        {note.text}
      </Text>
    </Box>
  );
}

export function VariantA({ entries }: { entries: MockEntry[] }) {
  return (
    <>
      {entries.map(entry => (
        <Box key={entry.id} marginTop="md">
          {entry.kind === 'workout' ? (
            <MockWorkoutTile entry={entry} />
          ) : (
            <NoteCardFull note={entry} />
          )}
        </Box>
      ))}
    </>
  );
}

// ---------------------------------------------------------------------------
// Variant B — separate card, clamp + tap-to-expand bottom sheet
// ---------------------------------------------------------------------------

const CLAMP_LINES = 3;

function NoteCardExpandable({ note }: { note: MockNoteEntry }) {
  const [open, setOpen] = useState(false);
  const isLong = note.text.length > 140 || note.text.includes('\n');

  return (
    <>
      <Pressable onPress={() => isLong && setOpen(true)} disabled={!isLong}>
        <Box backgroundColor="bgSecondary" borderRadius="lg" padding="base">
          <Box
            flexDirection="row"
            justifyContent="space-between"
            alignItems="center"
          >
            <Text
              variant="body-l-semibold"
              numberOfLines={1}
              style={{ flex: 1 }}
            >
              {note.title}
            </Text>
            <EntryDayLabel dayLabel={note.dayLabel} />
          </Box>
          <Text
            variant="body-s-regular"
            color="textSecondary"
            marginTop="sm"
            numberOfLines={CLAMP_LINES}
          >
            {note.text}
          </Text>
          {isLong && (
            <Text variant="body-s-medium" color="accent" marginTop="xs">
              Show more
            </Text>
          )}
        </Box>
      </Pressable>

      <Modal
        visible={open}
        transparent
        animationType="slide"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.5)',
            justifyContent: 'flex-end',
          }}
          onPress={() => setOpen(false)}
        >
          <Pressable onPress={() => {}}>
            <Box
              backgroundColor="bgSecondary"
              padding="base"
              style={{
                borderTopLeftRadius: 16,
                borderTopRightRadius: 16,
                minHeight: '50%',
              }}
            >
              <Box alignItems="center" marginBottom="sm">
                <Box
                  width={36}
                  height={4}
                  borderRadius="full"
                  backgroundColor="borderStrong"
                />
              </Box>
              <Text variant="h3">{note.title}</Text>
              <Text
                variant="body-s-regular"
                color="textSecondary"
                marginTop="sm"
              >
                {note.dayLabel}
              </Text>
              <Text variant="body-l-regular" marginTop="md">
                {note.text}
              </Text>
            </Box>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

export function VariantB({ entries }: { entries: MockEntry[] }) {
  return (
    <>
      {entries.map(entry => (
        <Box key={entry.id} marginTop="md">
          {entry.kind === 'workout' ? (
            <MockWorkoutTile entry={entry} />
          ) : (
            <NoteCardExpandable note={entry} />
          )}
        </Box>
      ))}
    </>
  );
}

// ---------------------------------------------------------------------------
// Variant C — merged into the tile when possible, light formatting, clamp
// with no expand
// ---------------------------------------------------------------------------

function FormattedNoteBody({ text }: { text: string }) {
  const lines = text.split('\n');

  return (
    <Box>
      {lines.map((line, i) => {
        const trimmed = line.trim();
        const isHeader = trimmed.startsWith('!') && trimmed.endsWith('!');
        const isBullet = trimmed.startsWith('-') || trimmed.startsWith('•');

        if (trimmed === '') {
          return <Box key={i} height={6} />;
        }

        if (isHeader) {
          return (
            <Text
              key={i}
              variant="body-s-medium"
              color="accent"
              marginTop={i === 0 ? undefined : 'sm'}
              style={{ textTransform: 'uppercase' }}
            >
              {trimmed.replace(/^!\s*/, '').replace(/\s*!$/, '')}
            </Text>
          );
        }

        if (isBullet) {
          return (
            <Box key={i} flexDirection="row" marginTop="xs">
              <Text variant="body-s-regular" color="textSecondary">
                {'• '}
              </Text>
              <Text
                variant="body-s-regular"
                color="textSecondary"
                style={{ flex: 1 }}
              >
                {trimmed.replace(/^[-•]\s*/, '')}
              </Text>
            </Box>
          );
        }

        return (
          <Text
            key={i}
            variant="body-s-regular"
            color="textSecondary"
            marginTop="xs"
          >
            {trimmed}
          </Text>
        );
      })}
    </Box>
  );
}

function MergedTile({
  workout,
  note,
}: {
  workout: Extract<MockEntry, { kind: 'workout' }>;
  note: MockNoteEntry;
}) {
  return (
    <Box backgroundColor="bgSecondary" borderRadius="lg" padding="base">
      <Box
        flexDirection="row"
        justifyContent="space-between"
        alignItems="center"
      >
        <Text variant="body-l-semibold" numberOfLines={1} style={{ flex: 1 }}>
          {workout.title}
        </Text>
        <EntryDayLabel dayLabel={workout.dayLabel} />
      </Box>
      <Text variant="body-s-regular" color="textSecondary" marginTop="xs">
        {formatDuration(workout.durationSeconds)}
      </Text>

      <Box
        marginTop="md"
        paddingTop="sm"
        style={{ borderTopWidth: 1 }}
        borderColor="borderDefault"
      >
        <Text
          variant="body-xs-medium"
          color="textTertiary"
          style={{ textTransform: 'uppercase' }}
        >
          Note · {note.title}
        </Text>
        <Box marginTop="xs" style={{ maxHeight: 60, overflow: 'hidden' }}>
          <FormattedNoteBody text={note.text} />
        </Box>
      </Box>
    </Box>
  );
}

function StandaloneNoteCard({ note }: { note: MockNoteEntry }) {
  return (
    <Box backgroundColor="bgSecondary" borderRadius="lg" padding="base">
      <Box
        flexDirection="row"
        justifyContent="space-between"
        alignItems="center"
      >
        <Text
          variant="body-xs-medium"
          color="textTertiary"
          style={{ textTransform: 'uppercase' }}
        >
          Note
        </Text>
        <EntryDayLabel dayLabel={note.dayLabel} />
      </Box>
      <Text variant="body-l-semibold" marginTop="xs">
        {note.title}
      </Text>
      <Box marginTop="sm" style={{ maxHeight: 80, overflow: 'hidden' }}>
        <FormattedNoteBody text={note.text} />
      </Box>
    </Box>
  );
}

export function VariantC({ entries }: { entries: MockEntry[] }) {
  const rendered: React.ReactNode[] = [];
  const consumedNoteIds = new Set<number>();

  entries.forEach((entry, index) => {
    if (consumedNoteIds.has(entry.id)) return;

    if (entry.kind === 'workout') {
      const sameDayNote = entries.find(
        (candidate, candidateIndex) =>
          candidateIndex > index &&
          candidate.kind === 'note' &&
          candidate.dayLabel === entry.dayLabel &&
          !consumedNoteIds.has(candidate.id),
      ) as MockNoteEntry | undefined;

      if (sameDayNote) {
        consumedNoteIds.add(sameDayNote.id);
        rendered.push(
          <Box key={entry.id} marginTop="md">
            <MergedTile workout={entry} note={sameDayNote} />
          </Box>,
        );
      } else {
        rendered.push(
          <Box key={entry.id} marginTop="md">
            <MockWorkoutTile entry={entry} />
          </Box>,
        );
      }

      return;
    }

    rendered.push(
      <Box key={entry.id} marginTop="md">
        <StandaloneNoteCard note={entry} />
      </Box>,
    );
  });

  return <>{rendered}</>;
}
