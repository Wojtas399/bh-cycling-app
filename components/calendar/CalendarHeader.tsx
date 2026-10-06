import { useTranslation } from 'react-i18next';
import { ActivityIndicator, TouchableOpacity } from 'react-native';

import Box from '@/components/Box';
import Text from '@/components/Text';
import CalendarViewToggle, {
  type CalendarView,
} from '@/components/calendar/CalendarViewToggle';
import { useAppTheme } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';

const REFRESH_SLOT_SIZE = 24;
const REFRESH_ICON_SIZE = 22;

export interface CalendarHeaderProps {
  view: CalendarView;
  onViewChange: (view: CalendarView) => void;
  /** The visible range, e.g. "Październik 2026". */
  title: string;
  onPrevious: () => void;
  onNext: () => void;
  onRefresh: () => void;
  /**
   * `refreshing` swaps the button for a spinner; `disabled` is the first load,
   * which a refresh would only duplicate.
   */
  refreshStatus: 'idle' | 'refreshing' | 'disabled';
}

/** The Calendar's two header rows: view toggle + refresh, then range navigation. */
export default function CalendarHeader({
  view,
  onViewChange,
  title,
  onPrevious,
  onNext,
  onRefresh,
  refreshStatus,
}: CalendarHeaderProps) {
  const { t } = useTranslation(undefined, { keyPrefix: 'calendar' });
  const theme = useAppTheme();

  return (
    <>
      <Box
        flexDirection="row"
        alignItems="center"
        justifyContent="space-between"
        paddingHorizontal="lg"
      >
        <CalendarViewToggle view={view} onViewChange={onViewChange} />

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
    </>
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
    <TouchableOpacity
      onPress={onPress}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Ionicons name={icon} size={24} color={theme.colors.textPrimary} />
    </TouchableOpacity>
  );
}
