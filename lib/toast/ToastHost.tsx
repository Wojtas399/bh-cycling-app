import theme from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { Toaster, type ToasterProps } from 'sonner-native';

const { colors, spacing, borderRadii, textVariants } = theme;

const ICON_SIZE = 20;
const label = textVariants['body-s-medium'];

/**
 * The Toast look and behaviour (ADR 0004). Every host spreads this, so a
 * toast looks the same whichever host shows it.
 */
export const toasterConfig = {
  position: 'top-center',
  theme: 'dark',
  enableStacking: true,
  visibleToasts: 3,
  gap: spacing.sm,
  swipeToDismissDirection: 'up',
  toastOptions: {
    style: {
      backgroundColor: colors.bgTertiary,
      borderRadius: borderRadii.full,
      borderWidth: 1,
      borderColor: colors.borderStrong,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.base,
      marginHorizontal: spacing['2xl'],
    },
    titleStyle: {
      color: colors.textPrimary,
      fontFamily: label.fontFamily,
      fontSize: label.fontSize,
      lineHeight: label.lineHeight,
    },
  },
  icons: {
    success: (
      <Ionicons
        name="checkmark-circle"
        size={ICON_SIZE}
        color={colors.success}
      />
    ),
    warning: (
      <Ionicons name="warning" size={ICON_SIZE} color={colors.warning} />
    ),
    error: (
      <Ionicons name="alert-circle" size={ICON_SIZE} color={colors.danger} />
    ),
  },
} satisfies Omit<ToasterProps, 'id'>;

interface ToastHostProps {
  /**
   * Names a sheet-level host. Omit it for the root host, which shows every
   * toast not sent to a named host.
   */
  id?: string;
}

/** Renders toasts. Mount the root host once, outside the navigator. */
export function ToastHost({ id }: ToastHostProps) {
  return <Toaster {...toasterConfig} id={id} />;
}
