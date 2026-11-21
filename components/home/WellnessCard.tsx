import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import Box from '@/components/Box';
import SheenSurface from '@/components/SheenSurface';
import Text from '@/components/Text';
import type { ShownTodayCardsState } from '@/hooks/home/useTodayCards';

const SKELETON_ROW_BAR_WIDTHS = [
  { key: 'first', label: 72, value: 48 },
  { key: 'second', label: 56, value: 40 },
  { key: 'third', label: 88, value: 52 },
];

export default function WellnessCard({
  state,
}: {
  state: ShownTodayCardsState;
}) {
  const { t } = useTranslation(undefined, { keyPrefix: 'home.wellness' });

  if (state.status === 'loading') {
    return (
      <Card loadingLabel={t('loading')}>
        {SKELETON_ROW_BAR_WIDTHS.map(({ key, label, value }, index) => (
          <LabelValueRow key={key} index={index}>
            <BodySLineSkeletonBar width={label} />
            <BodySLineSkeletonBar width={value} />
          </LabelValueRow>
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
        <LabelValueRow key={key} index={index}>
          <Text variant="body-s-regular" color="textSecondary">
            {t(`rows.${key}`)}
          </Text>
          <Text variant="body-s-medium">{value}</Text>
        </LabelValueRow>
      ))}
    </Card>
  );
}

function Card({
  loadingLabel,
  children,
}: {
  loadingLabel?: string;
  children: ReactNode;
}) {
  const { t } = useTranslation(undefined, { keyPrefix: 'home.wellness' });

  return (
    <SheenSurface
      padding="base"
      accessible={loadingLabel !== undefined}
      accessibilityLabel={loadingLabel}
      accessibilityState={loadingLabel ? { busy: true } : undefined}
    >
      <Text variant="h3" marginBottom="xs">
        {t('title')}
      </Text>
      {children}
    </SheenSurface>
  );
}

function LabelValueRow({
  index,
  children,
}: {
  index: number;
  children: ReactNode;
}) {
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

function BodySLineSkeletonBar({ width }: { width: number }) {
  return (
    <Box
      backgroundColor="bgTertiary"
      borderRadius="sm"
      style={{ width, height: 14, marginVertical: 3 }}
    />
  );
}
