import { useEffect, useId } from 'react';
import { StyleSheet, type TextStyle } from 'react-native';

import theme from '@/constants/theme';
import { liquidGlassAvailable } from '@/lib/liquidGlass';
import { registerSheetHost, unregisterSheetHost } from '@/lib/toast';
import { Ionicons } from '@expo/vector-icons';
import { GlassView } from 'expo-glass-effect';
import { Toaster, type ToasterProps } from 'sonner-native';

const { colors, spacing, borderRadii, textVariants } = theme;

const ICON_SIZE = 20;
const label = textVariants['body-s-medium'];

/**
 * The pill's surface. On iOS 26 it is native glass behind a transparent
 * toast, and the glass draws its own edge. Elsewhere it is a solid pill with
 * a ring.
 */
const surface = liquidGlassAvailable
  ? { backgroundColor: 'transparent' }
  : {
      backgroundColor: colors.bgTertiary,
      borderWidth: 1,
      borderColor: colors.borderStrong,
    };

/**
 * The Toast look and behaviour (ADR 0004). Every host spreads this, so a
 * toast looks the same whichever host shows it.
 */
export const toasterConfig = {
  position: 'top-center',
  theme: 'dark',
  // sonner's collapsed stack expands on tap and pauses every timer, so
  // toasts show as a plain list instead.
  enableStacking: false,
  visibleToasts: 3,
  gap: spacing.sm,
  swipeToDismissDirection: 'up',
  toastOptions: {
    style: {
      ...surface,
      borderRadius: borderRadii.full,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.base,
      marginHorizontal: spacing['2xl'],
    },
    titleStyle: {
      color: colors.textPrimary,
      fontFamily: label.fontFamily,
      fontSize: label.fontSize,
      lineHeight: label.lineHeight,
      // Overrides sonner's default '600', which Android would fake-bold.
      fontWeight: label.fontWeight as TextStyle['fontWeight'],
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
  backgroundComponent: liquidGlassAvailable ? (
    <GlassView
      glassEffectStyle="regular"
      colorScheme="dark"
      style={StyleSheet.absoluteFill}
    />
  ) : undefined,
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

/**
 * A host inside a sheet, for Android, where a sheet is a Dialog window that
 * covers the root host. It takes toasts while mounted, so mount it only while
 * the sheet is presented.
 */
export function SheetToastHost() {
  const id = useId();

  useEffect(() => {
    registerSheetHost(id);

    return () => unregisterSheetHost(id);
  }, [id]);

  return <ToastHost id={id} />;
}
