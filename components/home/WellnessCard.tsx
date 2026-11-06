import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import Box from '@/components/Box';
import Text from '@/components/Text';
import type { ShownTodayCardsState } from '@/hooks/home/useTodayCards';

/** Bar widths of the loading card's rows. */
const SKELETON_ROWS = [
  { key: 'first', label: 72, value: 48 },
  { key: 'second', label: 56, value: 40 },
  { key: 'third', label: 88, value: 52 },
];

/** Today's Wellness Entry on Home, as a plain read-only table. */
export default function WellnessCard({
  state,
}: {
  state: ShownTodayCardsState;
}) {
  const { t } = useTranslation(undefined, { keyPrefix: 'home.wellness' });

  if (state.status === 'loading') {
    return (
      <Card busyLabel={t('loading')}>
        {SKELETON_ROWS.map(({ key, label, value }, index) => (
          <Row key={key} index={index}>
            <Bar width={label} />
            <Bar width={value} />
          </Row>
        ))}
      </Card>
    );
  }

  if (state.wellness.length === 0) {
    return (
      <Card>
        <Text variant="body-s-regular" color="textSecondary">
          {t('empty')}
        </Text>
      </Card>
    );
  }

  return (
    <Card>
      {state.wellness.map(({ key, value }, index) => (
        <Row key={key} index={index}>
          <Text variant="body-s-regular" color="textSecondary">
            {t(`rows.${key}`)}
          </Text>
          <Text variant="body-s-medium">{value}</Text>
        </Row>
      ))}
    </Card>
  );
}

/** The card surface with its title; a `busyLabel` marks it as loading. */
function Card({
  busyLabel,
  children,
}: {
  busyLabel?: string;
  children: ReactNode;
}) {
  const { t } = useTranslation(undefined, { keyPrefix: 'home.wellness' });

  return (
    <Box
      backgroundColor="bgSecondary"
      borderRadius="lg"
      padding="base"
      accessible={busyLabel !== undefined}
      accessibilityLabel={busyLabel}
      accessibilityState={busyLabel ? { busy: true } : undefined}
    >
      <Text variant="h3" marginBottom="xs">
        {t('title')}
      </Text>
      {children}
    </Box>
  );
}

/** A label-left, value-right row, with a hairline above all but the first. */
function Row({ index, children }: { index: number; children: ReactNode }) {
  return (
    <Box
      flexDirection="row"
      justifyContent="space-between"
      alignItems="center"
      paddingVertical="sm"
      borderTopWidth={index > 0 ? 1 : 0}
      borderColor="borderDefault"
    >
      {children}
    </Box>
  );
}

/** A static skeleton bar, sized to a line of `body-s` text. */
function Bar({ width }: { width: number }) {
  return (
    <Box
      backgroundColor="bgTertiary"
      borderRadius="sm"
      style={{ width, height: 14, marginVertical: 3 }}
    />
  );
}
