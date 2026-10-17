import Box from '@/components/Box';
import Text from '@/components/Text';

export interface MetricGridItem {
  key: string;
  label: string;
  /** Already formatted, unit included. */
  value: string;
}

export interface MetricGridProps {
  items: MetricGridItem[];
}

/** A two-column grid of labelled metrics, label above value. */
export default function MetricGrid({ items }: MetricGridProps) {
  return (
    <Box flexDirection="row" flexWrap="wrap" rowGap="base">
      {items.map(({ key, label, value }) => (
        <Box key={key} width="50%">
          <Text variant="body-xs-regular" color="textSecondary">
            {label}
          </Text>
          <Text variant="body-xl-regular">{value}</Text>
        </Box>
      ))}
    </Box>
  );
}
