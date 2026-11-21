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
import FitnessChart from '@/components/fitness/FitnessChart';
import FitnessChartSkeleton from '@/components/fitness/FitnessChartSkeleton';
import FitnessRangeSelector from '@/components/fitness/FitnessRangeSelector';
import FitnessReadout from '@/components/fitness/FitnessReadout';
import { useAppTheme } from '@/constants/theme';
import {
  type FitnessChartState,
  useFitnessChart,
} from '@/hooks/fitness/useFitnessChart';
import { useFitnessLabels } from '@/hooks/fitness/useFitnessLabels';
import { useGlassHeader } from '@/hooks/useGlassHeader';
import { useStableSelect } from '@/hooks/useStableSelect';
import {
  DEFAULT_FITNESS_RANGE,
  type FitnessDay,
  type FitnessRange,
  fitnessReadoutDay,
  formatFitnessReadout,
  sliceFitnessRange,
} from '@/lib/fitness';

export default function FitnessChartScreen() {
  const { t } = useTranslation(undefined, { keyPrefix: 'fitness.chart' });
  const { state, refetch } = useFitnessChart();
  const [range, setRange] = useState<FitnessRange>(DEFAULT_FITNESS_RANGE);
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const header = useGlassHeader('pushed');
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
      <ScrollView
        {...header.scrollViewProps}
        contentContainerStyle={{
          flexGrow: 1,
          paddingHorizontal: theme.spacing.lg,
          paddingTop: header.scrollInsetTop + theme.spacing.sm,
          paddingBottom: insets.bottom + theme.spacing.xl,
        }}
        refreshControl={
          state.status === 'notConnected' ? undefined : (
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={theme.colors.textSecondary}
              progressViewOffset={header.scrollInsetTop}
            />
          )
        }
      >
        {state.status === 'notConnected' ? (
          <IntervalsConnectPrompt />
        ) : (
          <Box flex={1} gap="base">
            <FitnessRangeSelector range={range} onRangeChange={setRange} />
            <FitnessChartBody
              state={state}
              range={range}
              onRetry={() => void refetch()}
            />
          </Box>
        )}
      </ScrollView>
      <ScreenHeader title={t('title')} onLayout={header.onLayout}>
        <IntervalsReconnectBanner />
      </ScreenHeader>
    </Box>
  );
}

function FitnessChartBody({
  state,
  range,
  onRetry,
}: {
  state: Exclude<FitnessChartState, { status: 'notConnected' }>;
  range: FitnessRange;
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
      return <FitnessChartContent days={state.days} range={range} />;
  }
}

function FitnessChartContent({
  days,
  range,
}: {
  days: FitnessDay[];
  range: FitnessRange;
}) {
  const labels = useFitnessLabels();
  const [touched, setTouched] = useState<number | null>(null);
  const shown = useStableSelect(sliceFitnessRange, days, range);
  const todayAtEndOfLoadedYear = days[days.length - 1];
  const day = fitnessReadoutDay(shown, touched, todayAtEndOfLoadedYear);
  const readout = formatFitnessReadout(
    day,
    todayAtEndOfLoadedYear.date,
    labels,
  );

  return (
    <Box flex={1} gap="base">
      <FitnessReadout readout={readout} />
      <FitnessChart days={shown} range={range} onTouchDay={setTouched} />
    </Box>
  );
}
