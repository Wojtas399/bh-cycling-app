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

  function bodyPreferringDataOverError() {
    if (availability === 'loading') return <NoteDetailsSkeleton />;

    if (availability === 'unavailable') return <IntervalsConnectPrompt />;

    if (query.data) {
      return (
        <NoteDetailsScrollChildren
          note={query.data}
          onTopBlockLayoutInScrollContent={topBlock.onLayout}
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
        {bodyPreferringDataOverError()}
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

function NoteDetailsScrollChildren({
  note,
  onTopBlockLayoutInScrollContent,
}: {
  note: Note;
  onTopBlockLayoutInScrollContent: (event: LayoutChangeEvent) => void;
}) {
  const { t } = useTranslation(undefined, { keyPrefix: 'note' });
  const noteTitle = useNoteTitle();
  const dateLabels = useNoteDateLabels();
  const text = noteText(note);

  return (
    <>
      <Box
        paddingHorizontal="md"
        gap="base"
        onLayout={onTopBlockLayoutInScrollContent}
      >
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
