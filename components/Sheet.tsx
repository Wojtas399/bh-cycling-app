import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Box from '@/components/Box';
import { useAppTheme } from '@/constants/theme';
import { BottomSheetBackdrop, BottomSheetModal } from '@gorhom/bottom-sheet';
import type { BottomSheetBackdropProps } from '@gorhom/bottom-sheet';

/**
 * The scroll container a caller must wrap its own scrolling body in. A plain
 * `ScrollView` never hands the drag gesture back to the sheet, so a body
 * scrolled to the top could not be dragged closed. Re-exported here so a call
 * site needs one import to build a sheet, and so the rule is visible at the
 * seam that depends on it.
 */
export { BottomSheetScrollView } from '@gorhom/bottom-sheet';

/**
 * Full height, less the top safe-area inset supplied via `topInset` — for a
 * modal the library subtracts that inset from the container before resolving
 * percentages, so a notch-height strip of backdrop stays visible above the
 * sheet's rounded corners and remains a tap target.
 */
const SNAP_POINTS = ['100%'];

const HANDLE_WIDTH = 36;
const HANDLE_HEIGHT = 4;

export interface SheetProps {
  /** Drives `present()`/`dismiss()`. No caller ever handles a ref. */
  open: boolean;
  /**
   * Fires once per close, after the sheet has finished animating away —
   * whether it was dragged down, dismissed by a backdrop tap, or closed by the
   * caller setting `open` to false.
   */
  onClose: () => void;
  children: ReactNode;
}

/**
 * The shell every bottom sheet in the app is built in: backdrop, rounded top
 * corners, grab handle, bottom safe-area padding, height and theming.
 *
 * Shell-only by design. It renders no header and no scroll container, because
 * a caller's header has to stay pinned while its body scrolls — the caller
 * composes both, putting its body in `BottomSheetScrollView`.
 *
 * Named `Sheet` rather than `BottomSheet` so it does not shadow the library's
 * own export in the files that import both.
 */
export default function Sheet({ open, onClose, children }: SheetProps) {
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();

  const modalRef = useRef<BottomSheetModal>(null);

  /**
   * Whether the sheet is on screen: from the moment it is presented until the
   * close animation has finished. Held twice on purpose — as state, because it
   * decides what renders, and as a ref, so the effect below can read it
   * without treating its own writes as a reason to act again.
   */
  const [onScreen, setOnScreen] = useState(false);
  const onScreenRef = useRef(false);

  /**
   * The content the sheet is showing, latched on every open render so it
   * survives the close animation and slides away with the sheet. A caller that
   * clears the state it was rendering from — the usual shape, since `onClose`
   * is where that state gets dropped — would otherwise blank the sheet
   * mid-slide. Released once the sheet is off screen, so nothing stays in the
   * tree unread while closed (map Decision 9).
   */
  const shownChildren = useRef<ReactNode>(null);

  if (open) shownChildren.current = children;

  useEffect(() => {
    // Each branch is guarded on the sheet's actual position rather than on
    // `open` alone, which makes the effect converge instead of just react:
    // re-running it after `onScreen` settles is a no-op, and a caller that
    // leaves `open` true through a drag-to-dismiss gets the sheet presented
    // again rather than a shell stuck closed.
    if (open && !onScreenRef.current) {
      onScreenRef.current = true;
      setOnScreen(true);
      modalRef.current?.present();
    } else if (!open && onScreenRef.current) {
      modalRef.current?.dismiss();
    }
  }, [open, onScreen]);

  const handleDismiss = useCallback(() => {
    onScreenRef.current = false;
    shownChildren.current = null;
    setOnScreen(false);
    onClose();
  }, [onClose]);

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      // The shipped defaults are 1/0, which never appear on a single-detent
      // sheet; `pressBehavior` already defaults to 'close'.
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
      />
    ),
    [],
  );

  const backgroundStyle = useMemo(
    () => ({
      backgroundColor: theme.colors.bgSecondary,
      borderTopLeftRadius: theme.borderRadii.xl,
      borderTopRightRadius: theme.borderRadii.xl,
      // The sheet reaches the bottom of the screen, so the library's default
      // all-round radius would round two corners against the screen edge.
      borderBottomLeftRadius: 0,
      borderBottomRightRadius: 0,
    }),
    [theme],
  );

  const handleStyle = useMemo(
    () => ({
      paddingTop: theme.spacing.sm,
      paddingBottom: theme.spacing.base,
    }),
    [theme],
  );

  const handleIndicatorStyle = useMemo(
    () => ({
      width: HANDLE_WIDTH,
      height: HANDLE_HEIGHT,
      borderRadius: theme.borderRadii.full,
      backgroundColor: theme.colors.borderStrong,
    }),
    [theme],
  );

  return (
    <BottomSheetModal
      ref={modalRef}
      topInset={insets.top}
      snapPoints={SNAP_POINTS}
      // A fixed height is the opposite of dynamic sizing, which defaults on.
      enableDynamicSizing={false}
      // Defaults to false, and at full height the thin backdrop strip and the
      // caller's own close button are the only other ways out.
      enablePanDownToClose
      // Defaults to null — the backdrop only exists if it is passed.
      backdropComponent={renderBackdrop}
      backgroundStyle={backgroundStyle}
      handleStyle={handleStyle}
      handleIndicatorStyle={handleIndicatorStyle}
      onDismiss={handleDismiss}
    >
      <Box
        flex={1}
        style={{ paddingBottom: insets.bottom + theme.spacing.base }}
      >
        {open || onScreen ? shownChildren.current : null}
      </Box>
    </BottomSheetModal>
  );
}
