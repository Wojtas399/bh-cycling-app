import { TouchableOpacity } from 'react-native';

import type { AppTheme } from '@/constants/theme';
import {
  type BoxProps,
  boxRestyleFunctions,
  createRestyleComponent,
  createVariant,
} from '@shopify/restyle';

const Button = createRestyleComponent<
  BoxProps<AppTheme> &
    Omit<
      React.ComponentProps<typeof TouchableOpacity>,
      keyof BoxProps<AppTheme>
    > & { variant?: keyof AppTheme['buttonVariants'] },
  AppTheme
>(
  [
    createVariant({ themeKey: 'buttonVariants' }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ...(boxRestyleFunctions as any[]),
  ],
  TouchableOpacity,
);

export default Button;
