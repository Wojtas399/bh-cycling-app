import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  type LayoutChangeEvent,
  RefreshControl,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Box from '@/components/Box';
import DetailsLoadError from '@/components/DetailsLoadError';
import IntervalsConnectPrompt from '@/components/IntervalsConnectPrompt';
import NoteMarkdown from '@/components/NoteMarkdown';
import ScreenHeader from '@/components/ScreenHeader';
import Text from '@/components/Text';
import NoteDetailsSkeleton from '@/components/note/NoteDetailsSkeleton';
import { useAppTheme } from '@/constants/theme';
import { useNoteDetails } from '@/hooks/note/useNoteDetails';
import { useGlassHeader } from '@/hooks/useGlassHeader';
import { useNoteDateLabels } from '@/hooks/useNoteDateLabels';
import { useNoteTitle } from '@/hooks/useNoteTitle';
import { useScrolledUnderHeader } from '@/hooks/useScrolledUnderHeader';
import { noteFill } from '@/lib/noteColors';
import { formatNoteDates } from '@/lib/noteDates';
import { type Note, noteText } from '@/lib/notes';
import { useLocalSearchParams } from 'expo-router';

/**
 * Note Details: one Note, pushed over the tabs from its card. Mirrors Workout
 * Details and branches on the raw query (ADR 0005): data wins over an error,
 * so a failed pull-to-refresh keeps the Note on screen. The glass header has
 * no title until the Note's top block has scrolled under it, then carries
 * the Note's title.
 */
export default function NoteDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { availability, query, refetch } = useNoteDetails(Number(id));
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const header = useGlassHeader('pushed');
  const topBlock = useScrolledUnderHeader(header.height);
  const noteTitle = useNoteTitle();
  const [refreshing, setRefreshing] = useState(false);

  async function handleRefresh() {
    setRefreshing(true);

    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  }

  function body() {
    if (availability === 'loading') return <NoteDetailsSkeleton />;

    if (availability === 'unavailable') return <IntervalsConnectPrompt />;

    if (query.data) {
      return (
        <NoteDetailsContent
          note={query.data}
          onTopBlockLayout={topBlock.onLayout}
        />
      );
    }

    if (query.isError) {
      return (
        <DetailsLoadError
          keyPrefix="noteDetails"
          error={query.error}
          onRetry={() => void query.refetch()}
        />
      );
    }

    return <NoteDetailsSkeleton />;
  }

  return (
    <Box flex={1} backgroundColor="bgPrimary">
      <ScrollView
        {...header.scrollViewProps}
        onScroll={topBlock.onScroll}
        scrollEventThrottle={16}
        contentContainerStyle={{
          paddingHorizontal: theme.spacing.sm,
          paddingTop: header.scrollInsetTop + theme.spacing.base,
          paddingBottom: insets.bottom + theme.spacing.xl,
        }}
        refreshControl={
          availability === 'available' ? (
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={theme.colors.textSecondary}
              progressViewOffset={header.scrollInsetTop}
            />
          ) : undefined
        }
      >
        {body()}
      </ScrollView>
      <ScreenHeader
        title={
          query.data && topBlock.scrolledUnder ? noteTitle(query.data) : ''
        }
        onLayout={header.onLayout}
      />
    </Box>
  );
}

/**
 * The loaded Note: the top block (title, a dot in the Note's colour with its
 * dates, a divider), then the text. Both are direct children of the scroll
 * content, so the top block's layout is where it sits in it. The text is
 * Note Markdown in its own box, so no parent gap spreads its blocks.
 */
function NoteDetailsContent({
  note,
  onTopBlockLayout,
}: {
  note: Note;
  onTopBlockLayout: (event: LayoutChangeEvent) => void;
}) {
  const { t } = useTranslation(undefined, { keyPrefix: 'note' });
  const noteTitle = useNoteTitle();
  const dateLabels = useNoteDateLabels();
  const text = noteText(note);

  return (
    <>
      <Box paddingHorizontal="md" gap="base" onLayout={onTopBlockLayout}>
        <Text variant="h1">{noteTitle(note)}</Text>
        <Box flexDirection="row" alignItems="center" gap="sm">
          <Box
            width={10}
            height={10}
            borderRadius="full"
            style={{ backgroundColor: noteFill(note.color) }}
          />
          <Text variant="body-s-regular" color="textSecondary">
            {formatNoteDates(note, dateLabels)}
          </Text>
        </Box>
        <Box height={1} backgroundColor="borderDefault" />
      </Box>
      <Box paddingHorizontal="md" marginTop="lg">
        {text ? (
          <NoteMarkdown textWithHtmlStripped={text} />
        ) : (
          <Text variant="body-l-regular" color="textSecondary">
            {t('empty')}
          </Text>
        )}
      </Box>
    </>
  );
}
