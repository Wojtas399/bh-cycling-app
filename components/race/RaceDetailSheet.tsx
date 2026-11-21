import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import BottomSheet from '@/components/BottomSheet';
import Box from '@/components/Box';
import NoteMarkdown from '@/components/NoteMarkdown';
import Text from '@/components/Text';
import RacePriorityLabel from '@/components/race/RacePriorityLabel';
import { useNoteDateLabels } from '@/hooks/useNoteDateLabels';
import type { RaceSheetController } from '@/hooks/useRaceSheet';
import { formatMetric } from '@/lib/formatWorkoutMetric';
import { formatRaceDate } from '@/lib/raceLabels';
import { sportLabel } from '@/lib/sportIcon';
import { stripNoteHtml } from '@/lib/stripNoteHtml';

export interface RaceDetailSheetProps {
  sheet: RaceSheetController;
}

export default function RaceDetailSheet({ sheet }: RaceDetailSheetProps) {
  const { t } = useTranslation();
  const dateLabels = useNoteDateLabels();
  const { race } = sheet;
  const description = race?.description
    ? stripNoteHtml(race.description).trim()
    : '';

  return (
    <BottomSheet
      visible={sheet.visible}
      onClose={sheet.close}
      title={race?.name}
      testID="race-detail-sheet"
    >
      {race && (
        <>
          <RacePriorityLabel priority={race.priority} />

          <Box marginTop="sm">
            <Row label={t('race.sport')} first>
              {t(sportLabel(race.sport))}
            </Row>
            <Row label={t('race.date')}>{formatRaceDate(race, dateLabels)}</Row>
            {race.durationSeconds !== undefined && (
              <Row label={t('race.duration')}>
                {formatMetric('duration', race.durationSeconds)}
              </Row>
            )}
            {race.distanceMeters !== undefined && (
              <Row label={t('race.distance')}>
                {formatMetric('distance', race.distanceMeters)}
              </Row>
            )}
          </Box>

          {description ? (
            <Box marginTop="base">
              <NoteMarkdown textWithHtmlStripped={description} />
            </Box>
          ) : null}
        </>
      )}
    </BottomSheet>
  );
}

function Row({
  label,
  first = false,
  children,
}: {
  label: string;
  first?: boolean;
  children: ReactNode;
}) {
  return (
    <Box
      flexDirection="row"
      justifyContent="space-between"
      alignItems="center"
      paddingVertical="sm"
      borderTopWidth={first ? 0 : 1}
      borderColor="borderDefault"
    >
      <Text variant="body-s-regular" color="textSecondary" marginRight="base">
        {label}
      </Text>
      <Text variant="body-s-medium" style={{ flexShrink: 1 }}>
        {children}
      </Text>
    </Box>
  );
}
