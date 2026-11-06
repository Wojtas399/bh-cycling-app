import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { RefreshControl, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Box from '@/components/Box';
import IntervalsConnectPrompt from '@/components/IntervalsConnectPrompt';
import IntervalsReconnectBanner from '@/components/IntervalsReconnectBanner';
import MessageWithAction from '@/components/MessageWithAction';
import ScreenHeader from '@/components/ScreenHeader';
import Text from '@/components/Text';
import WellnessScopePrompt from '@/components/WellnessScopePrompt';
import FitnessChartSkeleton from '@/components/fitness/FitnessChartSkeleton';
import FitnessRangeSelector from '@/components/fitness/FitnessRangeSelector';
import FitnessReadout from '@/components/fitness/FitnessReadout';
import { useAppTheme } from '@/constants/theme';
import {
  type FitnessChartState,
  useFitnessChart,
} from '@/hooks/fitness/useFitnessChart';
import {
  DEFAULT_FITNESS_RANGE,
  type FitnessDay,
  type FitnessRange,
  formatFitnessReadout,
} from '@/lib/fitness';

/**
 * "Fitness i zmęczenie": the range selector, the readout row and the chart,
 * pushed over the tabs from Home's Fitness card. The content fills the
 * screen, so nothing scrolls; the ScrollView is there for pull-to-refresh.
 * It renders the state `useFitnessChart` hands it (ADR 0010). The range is
 * this visit's alone: every visit opens on 3 miesiące.
 */
export default function FitnessChartScreen() {
  const { t } = useTranslation(undefined, { keyPrefix: 'fitness.chart' });
  const { state, refetch } = useFitnessChart();
  const [range, setRange] = useState<FitnessRange>(DEFAULT_FITNESS_RANGE);
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);

  async function handleRefresh() {
    setRefreshing(true);

    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <Box flex={1} backgroundColor="bgPrimary">
      <ScreenHeader title={t('title')} />
      {/* Stacked over the tabs, so the tabs' banner for a 401 is hidden. */}
      <IntervalsReconnectBanner />
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          paddingHorizontal: theme.spacing.lg,
          paddingTop: theme.spacing.sm,
          paddingBottom: insets.bottom + theme.spacing.xl,
        }}
        refreshControl={
          state.status === 'notConnected' ? undefined : (
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={theme.colors.textSecondary}
            />
          )
        }
      >
        {state.status === 'notConnected' ? (
          <IntervalsConnectPrompt />
        ) : (
          <Box flex={1} gap="base">
            <FitnessRangeSelector range={range} onRangeChange={setRange} />
            <FitnessChartBody state={state} onRetry={() => void refetch()} />
          </Box>
        )}
      </ScrollView>
    </Box>
  );
}

/** What sits under the range selector: the readout and the chart, or why not. */
function FitnessChartBody({
  state,
  onRetry,
}: {
  state: Exclude<FitnessChartState, { status: 'notConnected' }>;
  onRetry: () => void;
}) {
  const { t } = useTranslation(undefined, { keyPrefix: 'fitness.chart' });

  switch (state.status) {
    case 'loading':
      return <FitnessChartSkeleton />;
    case 'needsScope':
      return <WellnessScopePrompt />;
    case 'error':
      return (
        <MessageWithAction
          message={t('error')}
          actionLabel={t('retry')}
          onAction={onRetry}
        />
      );
    case 'empty':
      return (
        <Text
          variant="body-l-regular"
          color="textSecondary"
          textAlign="center"
          padding="lg"
        >
          {t('empty')}
        </Text>
      );
    case 'ready':
      return <FitnessChartContent days={state.days} />;
  }
}

/** The loaded year: today's readout over the chart. */
function FitnessChartContent({ days }: { days: FitnessDay[] }) {
  const { t } = useTranslation();
  // The year ends today.
  const today = days[days.length - 1];
  const readout = formatFitnessReadout(today, today.date, {
    today: t('fitness.chart.today'),
    monthsShort: t('note.monthsShort', { returnObjects: true }),
  });

  return (
    <Box flex={1} gap="base">
      <FitnessReadout readout={readout} />
      {/* The chart's place. */}
      <Box flex={1} />
    </Box>
  );
}
