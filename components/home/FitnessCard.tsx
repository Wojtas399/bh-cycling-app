import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable } from 'react-native';

import Box from '@/components/Box';
import Text from '@/components/Text';
import type { ShownTodayCardsState } from '@/hooks/home/useTodayCards';
import { formatFitnessCard } from '@/lib/fitness';
import { useRouter } from 'expo-router';

const COLUMNS = ['fitness', 'fatigue', 'form'] as const;

/**
 * Today's Fitness, Fatigue and Form at the top of Home: three equal columns,
 * big numbers over small labels, with no title, and a muted "Zobacz więcej"
 * under them. Once loaded, the whole card is one button opening the chart,
 * on a day without values too.
 */
export default function FitnessCard({
  state,
}: {
  state: ShownTodayCardsState;
}) {
  const { t } = useTranslation(undefined, { keyPrefix: 'fitness' });
  const router = useRouter();

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

  const { values, label } = formatFitnessCard(state.fitness, {
    values: shown => t('cardLabel', shown),
    noValue: t('cardLabelNoValue'),
  });

  return (
    <Pressable
      onPress={() => router.push('/fitness')}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
    >
      <Card>
        {values === null ? (
          <Text
            variant="body-s-regular"
            color="textSecondary"
            textAlign="center"
          >
            {t('noValueToday')}
          </Text>
        ) : (
          <Box flexDirection="row">
            {COLUMNS.map((key, index) => (
              <Column key={key} index={index}>
                <Text variant="h2" style={{ fontVariant: ['tabular-nums'] }}>
                  {values[key]}
                </Text>
                <Text variant="body-xs-regular" color="textSecondary">
                  {t(`labels.${key}`)}
                </Text>
              </Column>
            ))}
          </Box>
        )}
        <Text
          variant="body-xs-medium"
          color="textSecondary"
          textAlign="center"
          marginTop="base"
        >
          {t('seeMore')}
        </Text>
      </Card>
    </Pressable>
  );
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
