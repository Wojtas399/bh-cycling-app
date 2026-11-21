import type { TextStyle } from 'react-native';
import type { MarkedStyles } from 'react-native-marked';

import type { AppTheme } from '@/constants/theme';

export function noteMarkedStylesInSystemFont(theme: AppTheme): MarkedStyles {
  const body: TextStyle = {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '400',
    color: theme.colors.textPrimary,
  };
  const heading = (
    fontSize: number,
    lineHeight: number,
    fontWeight: TextStyle['fontWeight'],
  ): TextStyle => ({
    fontSize,
    lineHeight,
    fontWeight,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.sm,
  });

  return {
    text: body,
    li: body,
    em: { ...body, fontStyle: 'italic' },
    strong: { ...body, fontWeight: '700' },
    strikethrough: { ...body, textDecorationLine: 'line-through' },
    link: { ...body, color: theme.colors.accent },
    paragraph: { marginBottom: theme.spacing.md, paddingVertical: 0 },
    list: { marginBottom: theme.spacing.md },
    h1: heading(24, 32, '700'),
    h2: heading(20, 28, '700'),
    h3: heading(18, 26, '600'),
    h4: heading(16, 24, '600'),
    h5: heading(15, 22, '600'),
    h6: { ...heading(14, 20, '600'), color: theme.colors.textSecondary },
    hr: {
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.borderDefault,
      marginVertical: theme.spacing.base,
    },
    blockquote: {
      borderLeftWidth: 3,
      borderLeftColor: theme.colors.borderStrong,
      paddingLeft: theme.spacing.md,
      marginBottom: theme.spacing.md,
    },
    codespan: { ...body, backgroundColor: theme.colors.insetFill },
    code: {
      backgroundColor: theme.colors.insetFill,
      padding: theme.spacing.md,
      marginBottom: theme.spacing.md,
    },
    codeText: { ...body, fontSize: 14, lineHeight: 20 },
  };
}
