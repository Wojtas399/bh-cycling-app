import { Children, Fragment } from 'react';

import Box from '@/components/Box';
import SheenSurface from '@/components/SheenSurface';
import Text from '@/components/Text';
import { ICON_TILE_SIZE } from '@/components/settings/SettingsRow';
import theme from '@/constants/theme';

interface SettingsSectionProps {
  title?: string;
  children: React.ReactNode;
  footer?: string;
  footerColor?: 'textTertiary' | 'danger';
}

const DIVIDER_INSET_TO_ROW_TEXT =
  theme.spacing.base + ICON_TILE_SIZE + theme.spacing.md;

export default function SettingsSection({
  title,
  children,
  footer,
  footerColor = 'textTertiary',
}: SettingsSectionProps) {
  const rows = Children.toArray(children);

  return (
    <Box marginTop="lg">
      {title ? (
        <Text
          testID="settings-section-title"
          variant="body-xs-medium"
          color="textTertiary"
          marginLeft="base"
          marginBottom="xs"
          style={{ textTransform: 'uppercase', letterSpacing: 0.5 }}
        >
          {title}
        </Text>
      ) : null}

      <SheenSurface marginHorizontal="base" overflow="hidden">
        {Children.map(rows, (row, index) => (
          <Fragment>
            {index > 0 ? (
              <Box
                testID="settings-section-divider"
                height={1}
                backgroundColor="borderDefault"
                style={{ marginLeft: DIVIDER_INSET_TO_ROW_TEXT }}
              />
            ) : null}
            {row}
          </Fragment>
        ))}
      </SheenSurface>

      {footer ? (
        <Text
          testID="settings-section-footer"
          variant="body-xs-regular"
          color={footerColor}
          marginHorizontal="base"
          marginTop="xs"
        >
          {footer}
        </Text>
      ) : null}
    </Box>
  );
}
