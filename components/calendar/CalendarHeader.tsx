import { useTranslation } from 'react-i18next';
import { ActivityIndicator, TouchableOpacity, View } from 'react-native';

import Box from '@/components/Box';
import GlassControl from '@/components/GlassControl';
import Text from '@/components/Text';
import CalendarViewToggle from '@/components/calendar/CalendarViewToggle';
import { useAppTheme } from '@/constants/theme';
import type { CalendarRefreshStatus } from '@/lib/calendarRefreshStatus';
import type { CalendarView } from '@/lib/calendarView';
import { liquidGlassAvailable } from '@/lib/liquidGlass';
import { Ionicons } from '@expo/vector-icons';
import { GlassContainer } from 'expo-glass-effect';

const REFRESH_SLOT_SIZE = 24;
const REFRESH_ICON_SIZE = 22;
const NAV_BUTTON_SIZE = 36;
const NAV_ICON_SIZE = 20;

/** Groups the header's native glass controls; a plain view elsewhere. */
const GlassGroup = liquidGlassAvailable ? GlassContainer : View;

export interface CalendarHeaderProps {
  view: CalendarView;
  onViewChange: (view: CalendarView) => void;
  /** The visible range, e.g. "Październik 2026". */
  title: string;
  onPrevious: () => void;
  onNext: () => void;
  /** Shows the "Dziś" pill: the visible range doesn't contain today. */
  showTodayPill: boolean;
  /** Goes back to the range containing today. */
  onToday: () => void;
  onRefresh: () => void;
  /**
   * `refreshing` swaps the button for a spinner; `disabled` is the first load,
   * which a refresh would only duplicate.
   */
  refreshStatus: CalendarRefreshStatus;
}

/**
 * The Calendar's two header rows: view toggle, "Dziś" pill + refresh, then
 * range navigation. The toggle, the pill and the nav buttons are chrome glass
 * in one glass group.
 */
export default function CalendarHeader({
  view,
  onViewChange,
  title,
  onPrevious,
  onNext,
  showTodayPill,
  onToday,
  onRefresh,
  refreshStatus,
}: CalendarHeaderProps) {
  const { t } = useTranslation(undefined, { keyPrefix: 'calendar' });
  const theme = useAppTheme();

  return (
    <GlassGroup>
      <Box
        flexDirection="row"
        alignItems="center"
        justifyContent="space-between"
        paddingHorizontal="lg"
      >
        <CalendarViewToggle view={view} onViewChange={onViewChange} />

        <Box flexDirection="row" alignItems="center" gap="md">
          {showTodayPill && (
            <GlassControl
              placement="chrome"
              onPress={onToday}
              hitSlop={{ top: 8, bottom: 8 }}
              accessibilityLabel={t('today')}
              style={{
                paddingHorizontal: theme.spacing.base,
                paddingVertical: theme.spacing.sm,
              }}
            >
              <Text variant="body-s-medium">{t('today')}</Text>
            </GlassControl>
          )}

          <Box
            width={REFRESH_SLOT_SIZE}
            height={REFRESH_SLOT_SIZE}
            alignItems="center"
            justifyContent="center"
          >
            {refreshStatus === 'refreshing' ? (
              <ActivityIndicator
                size="small"
                color={theme.colors.textSecondary}
                testID="calendar-refreshing"
              />
            ) : (
              <TouchableOpacity
                onPress={onRefresh}
                disabled={refreshStatus === 'disabled'}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={t('refresh')}
              >
                <Ionicons
                  name="refresh"
                  size={REFRESH_ICON_SIZE}
                  color={theme.colors.textSecondary}
                />
              </TouchableOpacity>
            )}
          </Box>
        </Box>
      </Box>

      <Box
        flexDirection="row"
        alignItems="center"
        justifyContent="space-between"
        paddingHorizontal="lg"
        marginVertical="base"
      >
        <NavButton
          icon="chevron-back"
          label={t('previous')}
          onPress={onPrevious}
        />
        <Text variant="h3">{title}</Text>
        <NavButton icon="chevron-forward" label={t('next')} onPress={onNext} />
      </Box>
    </GlassGroup>
  );
}

interface NavButtonProps {
  icon: 'chevron-back' | 'chevron-forward';
  label: string;
  onPress: () => void;
}

function NavButton({ icon, label, onPress }: NavButtonProps) {
  const theme = useAppTheme();

  return (
    <GlassControl
      placement="chrome"
      onPress={onPress}
      hitSlop={4}
      accessibilityLabel={label}
      style={{
        width: NAV_BUTTON_SIZE,
        height: NAV_BUTTON_SIZE,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Ionicons
        name={icon}
        size={NAV_ICON_SIZE}
        color={theme.colors.textPrimary}
      />
    </GlassControl>
  );
}
