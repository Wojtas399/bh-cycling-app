import { useAppTheme } from '@/constants/theme';

export function useThemeColor(
  props: { light?: string; dark?: string },
  colorName: keyof ReturnType<typeof useAppTheme>['colors'],
) {
  const theme = useAppTheme();

  return props.dark ?? theme.colors[colorName];
}
