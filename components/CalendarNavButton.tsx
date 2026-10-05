import { TouchableOpacity } from 'react-native';

import { useAppTheme } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';

export interface CalendarNavButtonProps {
  icon: 'chevron-back' | 'chevron-forward';
  label: string;
  onPress: () => void;
}

/** Previous/next chevron for stepping the Calendar's visible range. */
export default function CalendarNavButton({
  icon,
  label,
  onPress,
}: CalendarNavButtonProps) {
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
