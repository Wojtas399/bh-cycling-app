import { useCallback, useId } from 'react';
import { StyleSheet, type TextStyle, View } from 'react-native';

import theme from '@/constants/theme';
import { DarkGlassView, liquidGlassAvailable } from '@/lib/liquidGlass';
import { registerSheetHost, unregisterSheetHost } from '@/lib/toast';
import { Ionicons } from '@expo/vector-icons';
import { Toaster, type ToasterProps } from 'sonner-native';

const { colors, spacing, borderRadii, textVariants } = theme;

const ICON_SIZE = 20;
const label = textVariants['body-s-medium'];

const pillSurface = liquidGlassAvailable
  ? { backgroundColor: 'transparent' }
  : {
      backgroundColor: colors.bgTertiary,
      borderWidth: 1,
      borderColor: colors.borderStrong,
    };

function asTextStyleFontWeight(fontWeight: string): TextStyle['fontWeight'] {
  return fontWeight as TextStyle['fontWeight'];
}

export const toasterConfig = {
  position: 'top-center',
  theme: 'dark',
  enableStacking: false,
  visibleToasts: 3,
  gap: spacing.sm,
  swipeToDismissDirection: 'up',
  toastOptions: {
    style: {
      ...pillSurface,
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
      fontWeight: asTextStyleFontWeight(label.fontWeight),
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
    <DarkGlassView style={StyleSheet.absoluteFill} />
  ) : undefined,
} satisfies Omit<ToasterProps, 'id'>;

interface ToastHostProps {
  sheetHostId?: string;
}

export function ToastHost({ sheetHostId }: ToastHostProps) {
  return <Toaster {...toasterConfig} id={sheetHostId} />;
}

const FILL_SHEET_LETTING_TOUCHES_THROUGH = {
  style: StyleSheet.absoluteFill,
  pointerEvents: 'box-none',
} as const;

export function SheetToastHost() {
  const id = useId();
  const registerWhileAttached = useCallback(() => {
    registerSheetHost(id);

    return () => unregisterSheetHost(id);
  }, [id]);

  return (
    <View ref={registerWhileAttached} {...FILL_SHEET_LETTING_TOUCHES_THROUGH}>
      <ToastHost sheetHostId={id} />
    </View>
  );
}
