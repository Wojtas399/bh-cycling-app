import { useTranslation } from 'react-i18next';

import Box from '@/components/Box';
import Text from '@/components/Text';
import { ZONE_COLORS } from '@/components/WorkoutProfile';
import { useAppTheme } from '@/constants/theme';
import { formatDuration } from '@/lib/formatDuration';
import { formatStepDuration } from '@/lib/formatStepDuration';
import type { TimeInZoneRow, ZoneTimeBar } from '@/lib/timeInZone';

/** A row's bar with the side it's of. */
interface SideBar {
  side: 'planned' | 'recorded';
  bar: ZoneTimeBar;
}

/** Room for the zone label, so every row's bars start in line. */
const ZONE_WIDTH = 24;

/**
 * Room for the times, so every row's bars end in line and compare: one time,
 * or the plan's and the ride's.
 */
const SINGLE_TIME_WIDTH = 52;
const COMPARED_TIME_WIDTH = 104;

/** A bar's thickness, thinner when the plan's and the ride's share a row. */
const SINGLE_BAR_HEIGHT = 8;
const COMPARED_BAR_HEIGHT = 5;

/** See `ProfileWithTimeAxis`: the plan's bar is faint above the ride's. */
const PLANNED_OPACITY = 0.4;

/**
 * A zone's time: in whole minutes like the card's time axis, but in seconds
 * under a minute, so a short burst doesn't read as none.
 */
function formatZoneTime(seconds: number): string {
  return seconds < 60 ? formatStepDuration(seconds) : formatDuration(seconds);
}

export interface TimeInZoneRowsProps {
  rows: TimeInZoneRow[];
}

/**
 * The time-in-zone rows under the profile card: per zone, the plan's bar
 * faint above the ride's solid one, measured against the longest, with the
 * times. Each row is read by a screen reader as plain text.
 */
export default function TimeInZoneRows({ rows }: TimeInZoneRowsProps) {
  const { t } = useTranslation(undefined, {
    keyPrefix: 'workoutDetails.timeInZone',
  });
  const { colors } = useAppTheme();

  if (rows.length === 0) return null;

  // Every row has the same strips: the card's.
  const compared = rows[0].planned !== null && rows[0].recorded !== null;

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
        // The plan's bar above the ride's. A row has at least one.
        const bars: SideBar[] = [
          ...(planned ? [{ side: 'planned' as const, bar: planned }] : []),
          ...(recorded ? [{ side: 'recorded' as const, bar: recorded }] : []),
        ];

        return (
          <Box
            key={zone}
            accessible
            accessibilityLabel={label(zone, bars)}
            flexDirection="row"
            alignItems="center"
            gap="sm"
          >
            <Text variant="body-xs-medium" style={{ width: ZONE_WIDTH, color }}>
              Z{zone}
            </Text>
            <Box flex={1} gap="xs">
              {bars.map(({ side, bar }) => (
                <Box
                  key={side}
                  height={compared ? COMPARED_BAR_HEIGHT : SINGLE_BAR_HEIGHT}
                  borderRadius="full"
                  style={{
                    width: `${bar.share * 100}%`,
                    backgroundColor: color,
                    opacity:
                      compared && side === 'planned' ? PLANNED_OPACITY : 1,
                  }}
                />
              ))}
            </Box>
            <Text
              variant="body-xs-regular"
              color="textSecondary"
              style={{
                width: compared ? COMPARED_TIME_WIDTH : SINGLE_TIME_WIDTH,
                textAlign: 'right',
                fontVariant: ['tabular-nums'],
              }}
            >
              {bars.map(({ bar }) => formatZoneTime(bar.seconds)).join(' / ')}
            </Text>
          </Box>
        );
      })}
      {compared && (
        // Each row already says which time is which.
        <Box
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          <Text variant="body-xs-regular" color="textTertiary">
            {t('legend')}
          </Text>
        </Box>
      )}
    </Box>
  );
}
