import { useTranslation } from 'react-i18next';
import { Pressable } from 'react-native';

import GlassControl, {
  EDGE_MEASURING_ALIKE_ON_EVERY_PAINT,
} from '@/components/GlassControl';
import Text from '@/components/Text';
import { useAppTheme } from '@/constants/theme';
import { CALENDAR_VIEWS, type CalendarView } from '@/lib/calendarView';

export interface CalendarViewToggleProps {
  view: CalendarView;
  onViewChange: (view: CalendarView) => void;
}

export default function CalendarViewToggle({
  view,
  onViewChange,
}: CalendarViewToggleProps) {
  const { t } = useTranslation(undefined, { keyPrefix: 'calendar' });
  const { spacing } = useAppTheme();
  const segment = {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.xs,
  };

  return (
    <GlassControl
      placement="chrome"
      surfaceStyle={{ flexDirection: 'row', padding: spacing.xs }}
    >
      {CALENDAR_VIEWS.map(option => {
        const selected = option === view;
        const label = (
          <Text
            variant="body-s-medium"
            color={selected ? 'textInverse' : 'textSecondary'}
          >
            {t(option)}
          </Text>
        );

        return selected ? (
          <GlassControl
            key={option}
            placement="chrome"
            prominent
            onPress={() => onViewChange(option)}
            accessibilityState={{ selected }}
            surfaceStyle={segment}
          >
            {label}
          </GlassControl>
        ) : (
          <Pressable
            key={option}
            onPress={() => onViewChange(option)}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            style={[segment, EDGE_MEASURING_ALIKE_ON_EVERY_PAINT]}
          >
            {label}
          </Pressable>
        );
      })}
    </GlassControl>
  );
}
