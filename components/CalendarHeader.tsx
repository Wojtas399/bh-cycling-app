import { useTranslation } from 'react-i18next';
import { ActivityIndicator, TouchableOpacity } from 'react-native';

import Box from '@/components/Box';
import CalendarNavButton from '@/components/CalendarNavButton';
import CalendarViewToggle, {
  type CalendarView,
} from '@/components/CalendarViewToggle';
import Text from '@/components/Text';
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
  /** A refresh is in flight: the button gives way to a spinner. */
  refreshing: boolean;
  /** The first load is in flight: refreshing would only duplicate it. */
  refreshDisabled: boolean;
}

/** The Calendar's two header rows: view toggle + refresh, then range navigation. */
export default function CalendarHeader({
  view,
  onViewChange,
  title,
  onPrevious,
  onNext,
  onRefresh,
  refreshing,
  refreshDisabled,
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
          {refreshing ? (
            <ActivityIndicator
              size="small"
              color={theme.colors.textSecondary}
              testID="calendar-refreshing"
            />
          ) : (
            <TouchableOpacity
              onPress={onRefresh}
              disabled={refreshDisabled}
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
        <CalendarNavButton
          icon="chevron-back"
          label={t('previous')}
          onPress={onPrevious}
        />
        <Text variant="h3">{title}</Text>
        <CalendarNavButton
          icon="chevron-forward"
          label={t('next')}
          onPress={onNext}
        />
      </Box>
    </>
  );
}
