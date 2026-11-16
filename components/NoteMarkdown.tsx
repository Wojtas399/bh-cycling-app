import { useMemo } from 'react';
import type { ReactNode } from 'react';
import { Text as RNText, View } from 'react-native';
import type { ImageStyle, TextStyle, ViewStyle } from 'react-native';
import { Renderer, useMarkdown } from 'react-native-marked';
import type { MarkedStyles, RendererInterface } from 'react-native-marked';

import { type AppTheme, useAppTheme } from '@/constants/theme';

/**
 * Renders a Note's text-structural Markdown and tones down the rest.
 *
 * A Note is written in intervals.icu's editor, so it can hold anything
 * CommonMark allows, but it shows on a phone screen:
 *
 * - **Images** have unknown remote sizes, so they show as their alt text
 *   (nothing when there is no alt).
 * - **Tables** would overflow sideways, so each row becomes a wrapping line
 *   of cells. The content stays; the table grid doesn't.
 * - **Links** are styled but can't be tapped. A Note is read-only, and
 *   opening a browser from it loses the reader's place.
 */
class NoteRenderer extends Renderer implements RendererInterface {
  constructor(private readonly theme: AppTheme) {
    super();
  }

  image(_uri: string, alt?: string): ReactNode {
    if (!alt) return null;

    return (
      <RNText
        key={this.getKey()}
        style={{
          fontSize: 14,
          lineHeight: 20,
          color: this.theme.colors.textSecondary,
        }}
      >
        {alt}
      </RNText>
    );
  }

  linkImage(
    _href: string,
    imageUrl: string,
    alt?: string,
    _style?: ImageStyle,
  ): ReactNode {
    return this.image(imageUrl, alt);
  }

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

/**
 * The app's type scale and palette for Markdown elements. No `fontFamily`:
 * no Inter fonts are bundled, and on Android a custom family plus
 * `fontWeight` can drop the bold, so everything uses the system font.
 */
function noteMarkedStyles(theme: AppTheme): MarkedStyles {
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

export interface NoteMarkdownProps {
  /** Note Markdown, with any HTML already stripped. */
  text: string;
}

/**
 * A Note's text rendered from Markdown, as bare elements with no scroll
 * container of its own. The library's `<Markdown>` renders a FlatList, which
 * throws when nested in the screen's ScrollView, so it must never be used here.
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
        code: theme.colors.insetFill,
        border: theme.colors.borderDefault,
      },
    },
  });

  return <>{elements}</>;
}
