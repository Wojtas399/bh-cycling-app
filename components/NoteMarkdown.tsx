import { useMemo } from 'react';
import type { ReactNode } from 'react';
import { Text as RNText, View } from 'react-native';
import type { ImageStyle, TextStyle, ViewStyle } from 'react-native';
import { Renderer, useMarkdown } from 'react-native-marked';
import type { MarkedStyles, RendererInterface } from 'react-native-marked';

import { type AppTheme, useAppTheme } from '@/constants/theme';

/**
 * Renders the text-structural parts of a note and neutralises the rest.
 *
 * A note is authored by a coach in intervals.icu's editor, so it can contain
 * anything CommonMark allows — but it is displayed inside a bottom sheet
 * capped at 80% of the screen. Two element families are hazards there and are
 * deliberately degraded rather than rendered:
 *
 * - **Images** carry unbounded remote dimensions, so they render as their alt
 *   text (nothing at all when there is no alt) instead of resizing the sheet.
 * - **Tables** overflow horizontally, so their cells are stacked as plain
 *   rows. Content is preserved; the table widget is not.
 *
 * Links render as styled text rather than tappable targets — a note is a
 * read-only briefing, and opening a browser from a sheet loses the reader's
 * place.
 */
class NoteRenderer extends Renderer implements RendererInterface {
  constructor(private readonly theme: AppTheme) {
    super();
  }

  /** Alt text only — a remote image would resize the sheet unpredictably. */
  image(_uri: string, alt?: string, _style?: ImageStyle): ReactNode {
    if (!alt) return null;

    return (
      <RNText
        key={this.getKey()}
        style={{
          fontFamily: 'Inter-Regular',
          fontSize: 14,
          lineHeight: 20,
          color: this.theme.colors.textSecondary,
        }}
      >
        {alt}
      </RNText>
    );
  }

  /** Same treatment as a bare image; the wrapping link is dropped with it. */
  linkImage(
    _href: string,
    _imageUrl: string,
    alt?: string,
    style?: ImageStyle,
  ): ReactNode {
    return this.image(_imageUrl, alt, style);
  }

  /** Styled text, not a tappable target. */
  link(
    children: string | ReactNode[],
    _href: string,
    styles?: TextStyle,
  ): ReactNode {
    return (
      <RNText key={this.getKey()} style={styles}>
        {children}
      </RNText>
    );
  }

  /** Rows stacked vertically — lossless, but never wider than the sheet. */
  table(
    header: ReactNode[][],
    rows: ReactNode[][][],
    _tableStyle?: ViewStyle,
    _rowStyle?: ViewStyle,
    _cellStyle?: ViewStyle,
  ): ReactNode {
    return (
      <View key={this.getKey()} style={{ marginBottom: this.theme.spacing.md }}>
        {[header, ...rows].map(row => (
          <View
            key={this.getKey()}
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              gap: this.theme.spacing.sm,
            }}
          >
            {row.map(cell => (
              <View key={this.getKey()}>{cell}</View>
            ))}
          </View>
        ))}
      </View>
    );
  }
}

/** Maps the library's element styles onto the app's type scale and palette. */
function noteMarkedStyles(theme: AppTheme): MarkedStyles {
  const body: TextStyle = {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    lineHeight: 24,
    color: theme.colors.textPrimary,
  };

  return {
    text: body,
    li: body,
    em: { ...body, fontStyle: 'italic' },
    strong: {
      ...body,
      fontFamily: 'Inter-SemiBold',
      fontWeight: '600',
    },
    link: { ...body, color: theme.colors.accent },
    paragraph: { marginBottom: theme.spacing.md, paddingVertical: 0 },
    list: { marginBottom: theme.spacing.md },
    h1: {
      fontFamily: 'Inter-Bold',
      fontSize: 24,
      lineHeight: 32,
      color: theme.colors.textPrimary,
    },
    h2: {
      fontFamily: 'Inter-Bold',
      fontSize: 20,
      lineHeight: 28,
      color: theme.colors.textPrimary,
    },
    h3: {
      fontFamily: 'Inter-SemiBold',
      fontSize: 18,
      lineHeight: 26,
      color: theme.colors.textPrimary,
    },
    h4: {
      fontFamily: 'Inter-SemiBold',
      fontSize: 16,
      lineHeight: 24,
      color: theme.colors.textPrimary,
    },
    h5: {
      fontFamily: 'Inter-SemiBold',
      fontSize: 15,
      lineHeight: 22,
      color: theme.colors.textPrimary,
    },
    h6: {
      fontFamily: 'Inter-SemiBold',
      fontSize: 14,
      lineHeight: 20,
      color: theme.colors.textSecondary,
    },
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
    codespan: {
      ...body,
      backgroundColor: theme.colors.bgTertiary,
      color: theme.colors.textPrimary,
    },
    code: {
      backgroundColor: theme.colors.bgTertiary,
      padding: theme.spacing.md,
      marginBottom: theme.spacing.md,
    },
  };
}

export interface NoteMarkdownProps {
  /** Raw Markdown, as authored in intervals.icu. */
  text: string;
}

/**
 * A note's body, rendered from Markdown. Returns bare elements rather than its
 * own scroll container, so the caller keeps control of layout — the library's
 * default `<Markdown>` renders a FlatList, which cannot be nested inside the
 * sheet's existing ScrollView.
 */
export default function NoteMarkdown({ text }: NoteMarkdownProps) {
  const theme = useAppTheme();

  const renderer = useMemo(() => new NoteRenderer(theme), [theme]);
  const styles = useMemo(() => noteMarkedStyles(theme), [theme]);

  const elements = useMarkdown(text, {
    renderer,
    styles,
    theme: {
      colors: {
        text: theme.colors.textPrimary,
        link: theme.colors.accent,
        code: theme.colors.bgTertiary,
        border: theme.colors.borderDefault,
      },
    },
  });

  return <>{elements}</>;
}
