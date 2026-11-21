import { useMemo } from 'react';
import type { ReactNode } from 'react';
import { Text as RNText, View } from 'react-native';
import type { ImageStyle, TextStyle, ViewStyle } from 'react-native';
import { Renderer, useMarkdown } from 'react-native-marked';
import type { RendererInterface } from 'react-native-marked';

import { type AppTheme, useAppTheme } from '@/constants/theme';
import { noteMarkedStylesInSystemFont } from '@/lib/noteMarkedStyles';

class NoteMarkdownRenderer extends Renderer implements RendererInterface {
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

export interface NoteMarkdownProps {
  textWithHtmlStripped: string;
}

export default function NoteMarkdown({
  textWithHtmlStripped,
}: NoteMarkdownProps) {
  const theme = useAppTheme();

  const renderer = useMemo(() => new NoteMarkdownRenderer(theme), [theme]);
  const styles = useMemo(() => noteMarkedStylesInSystemFont(theme), [theme]);

  const bareElementsNestableInScrollView = useMarkdown(textWithHtmlStripped, {
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

  return <>{bareElementsNestableInScrollView}</>;
}
