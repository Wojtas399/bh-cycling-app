import { useTranslation } from 'react-i18next';

import Box from '@/components/Box';
import Text from '@/components/Text';
import { RANGE_CAP_OPACITY, ZONE_COLORS } from '@/components/WorkoutProfile';
import { useAppTheme } from '@/constants/theme';
import { formatZoneTime } from '@/lib/formatZoneTime';
import type { StripSide } from '@/lib/profileCard';
import type { TimeInZoneRow, ZoneTimeBar } from '@/lib/timeInZone';

interface SideBar {
  side: StripSide;
  bar: ZoneTimeBar;
}

const ZONE_LABEL_WIDTH_ALIGNING_BAR_STARTS = 24;

const ONE_TIME_WIDTH_ALIGNING_BAR_ENDS = 52;
const TWO_TIMES_WIDTH_ALIGNING_BAR_ENDS = 104;

const LONE_BAR_HEIGHT = 8;
const SHARED_ROW_BAR_HEIGHT = 5;

const PLANNED_BAR_OPACITY_AS_ON_PROFILE = RANGE_CAP_OPACITY;

const LEGEND_LEFT_OUT_AS_EACH_ROW_NAMES_ITS_TIMES = {
  accessibilityElementsHidden: true,
  importantForAccessibility: 'no-hide-descendants',
} as const;

export interface TimeInZoneRowsProps {
  rows: TimeInZoneRow[];
}

export default function TimeInZoneRows({ rows }: TimeInZoneRowsProps) {
  const { t } = useTranslation(undefined, {
    keyPrefix: 'workoutDetails.timeInZone',
  });
  const { colors } = useAppTheme();

  if (rows.length === 0) return null;

  const [anyRow] = rows;
  const everyRowCompares = anyRow.planned !== null && anyRow.recorded !== null;

  function label(zone: TimeInZoneRow['zone'], [first, second]: SideBar[]) {
    return second
      ? t('comparedRow', {
          zone,
          planned: formatZoneTime(first.bar.seconds),
          recorded: formatZoneTime(second.bar.seconds),
        })
      : t('row', { zone, time: formatZoneTime(first.bar.seconds) });
  }

  return (
    <Box gap="xs">
      {rows.map(({ zone, planned, recorded }) => {
        const color = colors[ZONE_COLORS[zone]];
        const planAboveRide: SideBar[] = [
          ...(planned ? [{ side: 'planned' as const, bar: planned }] : []),
          ...(recorded ? [{ side: 'recorded' as const, bar: recorded }] : []),
        ];

        return (
          <Box
            key={zone}
            accessible
            accessibilityLabel={label(zone, planAboveRide)}
            flexDirection="row"
            alignItems="center"
            gap="sm"
          >
            <Text
              variant="body-xs-medium"
              style={{ width: ZONE_LABEL_WIDTH_ALIGNING_BAR_STARTS, color }}
            >
              Z{zone}
            </Text>
            <Box flex={1} gap="xs">
              {planAboveRide.map(({ side, bar }) => (
                <Box
                  key={side}
                  height={
                    everyRowCompares ? SHARED_ROW_BAR_HEIGHT : LONE_BAR_HEIGHT
                  }
                  borderRadius="full"
                  style={{
                    width: `${bar.share * 100}%`,
                    backgroundColor: color,
                    opacity:
                      everyRowCompares && side === 'planned'
                        ? PLANNED_BAR_OPACITY_AS_ON_PROFILE
                        : 1,
                  }}
                />
              ))}
            </Box>
            <Text
              variant="body-xs-regular"
              color="textSecondary"
              style={{
                width: everyRowCompares
                  ? TWO_TIMES_WIDTH_ALIGNING_BAR_ENDS
                  : ONE_TIME_WIDTH_ALIGNING_BAR_ENDS,
                textAlign: 'right',
                fontVariant: ['tabular-nums'],
              }}
            >
              {planAboveRide
                .map(({ bar }) => formatZoneTime(bar.seconds))
                .join(' / ')}
            </Text>
          </Box>
        );
      })}
      {everyRowCompares && (
        <Box {...LEGEND_LEFT_OUT_AS_EACH_ROW_NAMES_ITS_TIMES}>
          <Text variant="body-xs-regular" color="textTertiary">
            {t('legend')}
          </Text>
        </Box>
      )}
    </Box>
  );
}
