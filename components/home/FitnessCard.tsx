import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import Box from '@/components/Box';
import Text from '@/components/Text';
import type { ShownTodayCardsState } from '@/hooks/home/useTodayCards';
import { type FitnessValues, formatForm } from '@/lib/fitness';

const COLUMNS = ['fitness', 'fatigue', 'form'] as const;

/**
 * Today's Fitness, Fatigue and Form at the top of Home: three equal columns,
 * big numbers over small labels, with no title.
 */
export default function FitnessCard({
  state,
}: {
  state: ShownTodayCardsState;
}) {
  const { t } = useTranslation(undefined, { keyPrefix: 'fitness' });

  if (state.status === 'loading') {
    return (
      <Card busyLabel={t('loading')}>
        <Box flexDirection="row">
          {COLUMNS.map((key, index) => (
            <Column key={key} index={index}>
              <Bar width={40} height={24} marginVertical={4} />
              <Bar width={56} height={10} marginVertical={3} />
            </Column>
          ))}
        </Box>
      </Card>
    );
  }

  const { fitness } = state;

  return (
    <Card>
      {fitness === null ? (
        <Text variant="body-s-regular" color="textSecondary" textAlign="center">
          {t('noValueToday')}
        </Text>
      ) : (
        <Box flexDirection="row">
          {COLUMNS.map((key, index) => (
            <Column key={key} index={index}>
              <Text variant="h2" style={{ fontVariant: ['tabular-nums'] }}>
                {formatValue(fitness, key)}
              </Text>
              <Text variant="body-xs-regular" color="textSecondary">
                {t(`labels.${key}`)}
              </Text>
            </Column>
          ))}
        </Box>
      )}
    </Card>
  );
}

function formatValue(values: FitnessValues, key: keyof FitnessValues): string {
  return key === 'form' ? formatForm(values.form) : `${values[key]}`;
}

/** The card surface; a `busyLabel` marks it as loading. */
function Card({
  busyLabel,
  children,
}: {
  busyLabel?: string;
  children: ReactNode;
}) {
  return (
    <Box
      backgroundColor="bgSecondary"
      borderRadius="lg"
      padding="base"
      accessible={busyLabel !== undefined}
      accessibilityLabel={busyLabel}
      accessibilityState={busyLabel ? { busy: true } : undefined}
    >
      {children}
    </Box>
  );
}

/** One of three equal, centred columns, with a hairline left of all but the first. */
function Column({ index, children }: { index: number; children: ReactNode }) {
  return (
    <Box
      flex={1}
      alignItems="center"
      borderLeftWidth={index > 0 ? 1 : 0}
      borderColor="borderDefault"
    >
      {children}
    </Box>
  );
}

/** A static skeleton bar, sized to a line of text. */
function Bar({
  width,
  height,
  marginVertical,
}: {
  width: number;
  height: number;
  marginVertical: number;
}) {
  return (
    <Box
      backgroundColor="bgTertiary"
      borderRadius="sm"
      style={{ width, height, marginVertical }}
    />
  );
}
