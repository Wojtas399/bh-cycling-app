import Box from '@/components/Box';
import Text from '@/components/Text';

export interface MetricGridItem {
  key: string;
  label: string;
  formattedValue: string;
}

export interface MetricGridProps {
  items: MetricGridItem[];
}

export default function MetricGrid({ items }: MetricGridProps) {
  return (
    <Box flexDirection="row" flexWrap="wrap" rowGap="base">
      {items.map(({ key, label, formattedValue }) => (
        <Box key={key} width="50%">
          <Text variant="body-xs-regular" color="textSecondary">
            {label}
          </Text>
          <Text variant="body-xl-regular">{formattedValue}</Text>
        </Box>
      ))}
    </Box>
  );
}
