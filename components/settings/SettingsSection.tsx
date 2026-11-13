import { Children, Fragment } from 'react';

import Box from '@/components/Box';
import SheenSurface from '@/components/SheenSurface';
import Text from '@/components/Text';

interface SettingsSectionProps {
  title?: string;
  children: React.ReactNode;
  footer?: string;
  footerColor?: 'textTertiary' | 'danger';
}

// Row horizontal padding (base = 16) + icon tile (28) + gap (md = 12).
const DIVIDER_INSET = 56;

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
                style={{ marginLeft: DIVIDER_INSET }}
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
