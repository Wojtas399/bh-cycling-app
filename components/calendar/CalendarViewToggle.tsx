import { useTranslation } from 'react-i18next';
import { TouchableOpacity } from 'react-native';

import Box from '@/components/Box';
import Text from '@/components/Text';
import { CALENDAR_VIEWS, type CalendarView } from '@/lib/calendarView';

export interface CalendarViewToggleProps {
  view: CalendarView;
  onViewChange: (view: CalendarView) => void;
}

/** Segmented control switching the Calendar between its monthly and weekly views. */
export default function CalendarViewToggle({
  view,
  onViewChange,
}: CalendarViewToggleProps) {
  const { t } = useTranslation(undefined, { keyPrefix: 'calendar' });

  return (
    <Box
      flexDirection="row"
      backgroundColor="bgTertiary"
      borderRadius="full"
      padding="xs"
    >
      {CALENDAR_VIEWS.map(option => {
        const selected = option === view;

        return (
          <TouchableOpacity
            key={option}
            onPress={() => onViewChange(option)}
            accessibilityRole="button"
            accessibilityState={{ selected }}
          >
            <Box
              paddingHorizontal="base"
              paddingVertical="xs"
              borderRadius="full"
              backgroundColor={selected ? 'interactiveDefault' : 'transparent'}
            >
              <Text
                variant="body-s-medium"
                color={selected ? 'textInverse' : 'textSecondary'}
              >
                {t(option)}
              </Text>
            </Box>
          </TouchableOpacity>
        );
      })}
    </Box>
  );
}
