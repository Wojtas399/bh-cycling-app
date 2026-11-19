# Research: Expo UI `BottomSheet` on our stack

Ticket: [#66](https://github.com/Wojtas399/bh-cycling-app/issues/66) (part of map [#65](https://github.com/Wojtas399/bh-cycling-app/issues/65)).
Date: 2026-10-09.

**Question.** Can Expo UI's `BottomSheet` (`@expo/ui`, Expo SDK 57) do what our sheets need on this stack (Expo ~57.0.26, RN 0.86.3, New Architecture, `expo-dev-client`, iOS + Android), and how?

**Requirements (agreed).** A declarative `visible`/`onClose` wrapper. An optional title and ✕ header. Height set by the content, up to a max. A scrollable list inside (`WorkoutTile`s). Dismiss by swipe, backdrop tap, ✕ and Android back. A native look is fine. We strongly prefer Expo built-ins.

**Sources.** I read the published `@expo/ui@57.0.22` package source (`npm view @expo/ui dist-tags` → `sdk-57: 57.0.22`, also `latest`). I downloaded the tarball into a temp dir outside the repo. Its source is the same as [`expo/expo/packages/expo-ui`](https://github.com/expo/expo/tree/main/packages/expo-ui) at `gitHead 50ac74f`. I also used its `CHANGELOG.md`, the SDK 57 docs, open issues on `expo/expo`, and a throwaway Jest run against this repo's installed `jest-expo@57.0.5` and `@testing-library/react-native@14`. `@expo/ui` was **not** installed in the repo.

---

## TL;DR / verdict

**It meets the requirements, with workarounds.** No hard requirement fails. Use the **universal `BottomSheet`** (`import { BottomSheet, RNHostView } from '@expo/ui'`) inside our own `AppBottomSheet` wrapper. Its API (`isPresented` + `onDismiss`) maps 1:1 onto `visible`/`onClose`. Swipe, backdrop tap and Android back are built in on both platforms. A programmatic close (✕) animates out on both platforms.

Workarounds we need:

1. **Hosting RN content.** Wrap the content in `<RNHostView matchContents>` and give the inner RN `View` an explicit `width`. Without a width it shrinks to its own width (the same fix Expo applied in its own drop-in, `#49762`).
2. **Max height.** The universal API has no max-height prop. With no `snapPoints` the sheet sizes itself to the content, so we cap the height on the RN side: `maxHeight` on the inner `View`, with the `ScrollView` shrinking inside it. Put `nestedScrollEnabled` on the `ScrollView` so drag-to-dismiss still works on Android.
3. **Android partial state.** In fit-to-content mode the universal component passes `skipPartiallyExpanded={false}` to Material 3. Content taller than about half the screen would therefore **open at about 50%** and need a drag up to its full height. To avoid that, the Android branch of our wrapper can render `ModalBottomSheet` from `@expo/ui/jetpack-compose` directly with `skipPartiallyExpanded`, as Expo's own drop-in does. Or we accept the behaviour.
4. **Jest.** Unmocked, the sheet renders under `jest-expo`, but presses inside it are ignored and the content does not unmount on close. We need a small `jest.mock('@expo/ui', …)`.

Everything in sections 3, 5, 7 and 8 that concerns on-device behaviour comes from reading the source and docs. It is **not yet verified on a device**. Prototype it first (map #65 / #67).

---

## 1. Which variant

`@expo/ui@57` ships four sheet entry points:

| Variant                     | Import                            | What it is                                                                                                                                                                     |
| --------------------------- | --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Universal** `BottomSheet` | `@expo/ui`                        | Declarative `isPresented`/`onDismiss`. iOS → SwiftUI `.sheet`, Android → M3 `ModalBottomSheet`, web → vaul. Source: `src/universal/BottomSheet/index.{ios,android,}.tsx`.      |
| SwiftUI `BottomSheet`       | `@expo/ui/swift-ui`               | iOS only. `isPresented` + `onIsPresentedChange`, `fitToContents`, presentation modifiers on a `Group`.                                                                         |
| Compose `ModalBottomSheet`  | `@expo/ui/jetpack-compose`        | Android only. Mount and unmount it yourself, call `ref.hide()` to animate out, `onDismissRequest`. Has `skipPartiallyExpanded`, `properties`, colours and a `DragHandle` slot. |
| gorhom drop-in              | `@expo/ui/community/bottom-sheet` | A `@gorhom/bottom-sheet`-compatible API (`index`, ref `present/close`, `enablePanDownToClose`, `BottomSheetView`/`BottomSheetScrollView`) over the same native sheets.         |

Trade-offs for us:

- **Universal (recommended).** The declarative API matches our wrapper exactly. It handles the animated close itself: on Android it calls `ref.hide()` before unmounting, on iOS SwiftUI animates it. `onDismiss` fires only on dismissals the user starts, not when we set `isPresented={false}`. On iOS the Swift view skips the event when the native state already equals the prop. It exposes `containerColor`, `contentPadding`, `showDragIndicator`, Android `shouldDismissOnBackPress`/`shouldDismissOnClickOutside`/`scrimColor`, and a `modifiers` escape hatch.
  - Downsides: we wrap RN content in `RNHostView` ourselves. Android fit-to-content can open at the partial state (see §5).
- **gorhom drop-in.** It handles RN hosting for us: it wraps children in `RNHostView`, sets `width`, resets the nested-list contexts, and on Android uses `skipPartiallyExpanded` when fitting to content. Its downsides fit our use worse:
  - The API is imperative or index-based.
  - Setting `index` to `-1` via props on Android sets `isOpen=false` straight away, with **no hide animation**. Only `ref.close()` animates.
  - `backgroundStyle` is **ignored on iOS** (the sheet uses the system background), and there is no `modifiers` escape hatch.
  - `enablePanDownToClose` switches swipe, backdrop and back on or off together (default `false`).
  - [README](https://github.com/expo/expo/blob/main/packages/expo-ui/src/community/bottom-sheet/README.md), [docs](https://docs.expo.dev/versions/v57.0.0/sdk/ui/drop-in-replacements/bottomsheet/).
- **Platform-specific primitives.** They give the most control, but we would write two code paths. They are only worth it on Android, for `skipPartiallyExpanded` (§5).

## 2. Stability, Expo Go vs dev build, install

- **Status.** In the SDK 57 docs, Expo UI has **no ALPHA/BETA badge**, while other packages such as Maps and AppIntegrity do ([docs nav](https://docs.expo.dev/versions/v57.0.0/sdk/ui/)). The package dropped its `0.x-beta` versioning at SDK 55 (CHANGELOG `55.0.0-beta.*`, then `56.0.0`, `57.0.0`).
- **Churn is still high.** **Breaking changes land in patch releases**, for example `57.0.14` removed `style` from the Android `RNHostView`, and `57.0.9` changed SwiftUI stack spacing (CHANGELOG). **Pin an exact version.**
- **Expo Go.** The docs say "Included in Expo Go". We use `expo-dev-client`, and `@expo/ui` has native code (`ios/`, `android/`, `expo-module.config.json`). So: `npx expo install @expo/ui` (it resolves the `sdk-57` tag, currently `57.0.22`), then **rebuild the dev client** (`npm run ios` / `npm run android`, or an EAS dev build).
- **Platform minimums.** iOS/tvOS minimum is 16.4 (`56.0.0` breaking change). iOS `containerColor` needs 16.4+ (types doc). Dependencies: `vaul` (web only) and `sf-symbols-typescript`. `react-native-worklets` is an optional peer, and we already have it.

## 3. `Host` requirements and sizing with RN children

- **The consumer does not need a `Host`.** The universal `BottomSheet` renders its own `<Host style={{ position: 'absolute' }} pointerEvents="none">` around the native sheet (`index.ios.tsx`, `index.android.tsx`; changelog `56.0.10`: "making `Host` optional"). It can sit anywhere in the screen tree and takes no layout space.
- **RN children need a bridge.** The docs say "Once you render React Native components inside SwiftUI, you leave the SwiftUI context." On Android the universal sheet wraps children in a Compose `Column`. Use the universal `RNHostView` from `@expo/ui`.
- **Fit-to-content sizing.** Use `matchContents`, so the host takes the RN subtree's measured size ([SwiftUI sheet docs](https://docs.expo.dev/versions/v57.0.0/sdk/ui/swift-ui/bottomsheet/): "Wrap content in `RNHostView matchContents` with `fitToContents`").
- **Width gotcha.** With `matchContents` the RN view is laid out at **its own** size, so give it an explicit width. Expo's drop-in passes `{ width }` from `useWindowDimensions()`, and the source comment says: "With matchContents, RNHostView lays the hosted view out at its own size, so `width` gives it the sheet width." See also changelog `57.0.17`, `#49762`. Subtract any `contentPadding`, or pass `contentPadding={0}` and pad on the RN side.
- **Fixes in our version range.** Hosted RN views receiving no touches in an iOS `BottomSheet` (`57.0.14`, `#48969`). Pressables dropping presses on Android (`57.0.9`, `#48217`). A `matchContents` host growing on every layout pass (`57.0.15`, `#49483`). An Android `performMeasureAndLayout` crash with Reanimated (`57.0.22`, `#49933`).

## 4. Open/close API and dismiss callbacks

The universal props are `isPresented: boolean` and `onDismiss: () => void`, both required ([universal docs](https://docs.expo.dev/versions/v57.0.0/sdk/ui/universal/bottomsheet/), `types.ts`). Control is **declarative**, with no ref.

- **iOS.** `isPresented` maps to SwiftUI `.sheet(isPresented:)`. A user dismissal fires `onIsPresentedChange(false)`, which calls `onDismiss()`. Content mounts on present and unmounts after SwiftUI's own `onDismiss`, once the animation finishes (`swift-ui/BottomSheet/index.tsx`, `ios/BottomSheetView.swift`).
- **Android.** When `isPresented` becomes false, the component calls `sheetRef.current.hide()` (animated) and unmounts once that finishes. User dismissals (swipe, scrim, back) call `onDismissRequest`, which calls `onDismiss` (`index.android.tsx`).

So `<BottomSheet isPresented={visible} onDismiss={onClose}>` is our whole wrapper contract. The ✕ just calls `onClose`, and the parent sets `visible=false`.

## 5. Height set by content, with a max, plus scrollable RN content

- **Fit to content.** Omitting `snapPoints` makes the sheet size to its content.
  - On iOS, `fitToContents` reads the content height with a `GeometryReader` and sets `presentationDetents([.height(h)])` (`BottomSheetView.swift`).
  - On Android, M3 sizes the sheet to the content's intrinsic height.
  - `snapPoints` accepts `'half' | 'full' | {fraction} | {height}`. On Android, `{fraction}`/`{height}` snap to the nearest of half/full (types, docs).
- **Max height: not in the universal API.** There is no max-height prop. Cap it on the RN side:

  ```tsx
  <BottomSheet isPresented={visible} onDismiss={onClose} contentPadding={0}>
    <RNHostView matchContents>
      <View style={{ width, maxHeight: height * 0.7, paddingHorizontal: 16 }}>
        <Header title={title} onClose={onClose} />
        <ScrollView nestedScrollEnabled>{/* WorkoutTiles */}</ScrollView>
      </View>
    </RNHostView>
  </BottomSheet>
  ```

  RN's `ScrollView` shrinks by default (`flexShrink: 1`), so it fills whatever `maxHeight` leaves after the header and scrolls the rest. The measured height (≤ max) becomes the iOS detent and the Android intrinsic height. This is the same pattern as our current `CalendarDaySheet` (`maxHeight: '70%'`). _Not yet checked on a device._

- **Scrolling on Android.** Use `nestedScrollEnabled` on the scrollable: "Without nestedScrollEnabled the list consumes the gesture and the sheet doesn't move" ([Compose sheet docs](https://docs.expo.dev/versions/v57.0.0/sdk/ui/jetpack-compose/bottomsheet/)). Nested RN `ScrollView` scrolling was fixed in `56.0.16` (`#46544`).
- **Scrolling on iOS.** The docs show scrollables inside `RNHostView` sized by detents. Our fit-to-content + `maxHeight` combination is not a documented example. Verify it in the prototype.
- **Android partial-state gotcha.** With no `snapPoints`, the universal component sets `skipPartiallyExpanded={false}` (`shouldSkipPartiallyExpanded(undefined) === false`). The docs say: "the half state appears only when content is tall enough to pass Material's partial threshold". So a day with many workouts (content capped at 70%) would open at about 50% on Android.
  - Passing `snapPoints={['full']}` skips the partial state but also adds `fillMaxHeight()`, which makes the sheet full height, so there is no universal-only fix.
  - Workaround: in an `AppBottomSheet.android.tsx`, render `ModalBottomSheet` from `@expo/ui/jetpack-compose` with `skipPartiallyExpanded` + `RNHostView matchContents`, calling `ref.hide()` on a programmatic close. Expo's drop-in does exactly this (`skipPartially = fitToContents || !hasMultipleSnapPoints`). Or accept the half-open state.
- **Nested-list warning.** If the sheet is ever mounted inside a `FlatList`, RN's VirtualizedList nesting check can break inner scrolling. The drop-in resets `ScrollViewContext`/`VirtualizedListContext` (`scrollContextReset.tsx`). The calendar screen does not nest it today.

## 6. Dismiss paths

| Path                         | iOS (universal)                                                                                                   | Android (universal)                                                                                              |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Swipe down                   | Built in (SwiftUI sheet)                                                                                          | Built in (M3). The universal API doesn't expose `sheetGesturesEnabled`, so it is always on                       |
| Backdrop tap                 | Built in. It can't be turned off separately (drop-in README: "SwiftUI does not allow separating these behaviors") | Built in, `shouldDismissOnClickOutside` (default `true`)                                                         |
| Hardware back / back gesture | n/a                                                                                                               | Built in, `shouldDismissOnBackPress` (default `true`). The press **does not reach RN `BackHandler`** (types doc) |
| ✕ button                     | Our RN `Pressable` → `onClose` → `isPresented=false` → animated SwiftUI dismiss                                   | Same → `ref.hide()` animation → unmount                                                                          |

All four required paths work. Swipe, backdrop and back need no code from us.

## 7. Styling

- **Background.** Use the universal `containerColor` (Android, iOS 16.4+, web). On iOS it maps to `presentationBackground`, which also paints the drag-indicator area and the home-indicator inset (types doc). RN children don't inherit text colour, so set it ourselves.
- **Corner radius.**
  - iOS: `presentationCornerRadius(n)` via `modifiers` (added `57.0.21`).
  - Android: **not configurable**. `ModalBottomSheet` has no `shape` prop, so it keeps the M3 default.
- **Drag indicator.** `showDragIndicator` (default `true`). Android also has a custom `ModalBottomSheet.DragHandle` slot, primitive only.
- **Padding.** `contentPadding` defaults: iOS top 16 / sides 16; Android top 0 when the handle shows / sides 16.
- **Scrim.** Android `scrimColor`. iOS uses the system dimming.
- **Dark mode.**
  - iOS follows the system scheme by default. Override it with the `preferredColorScheme` modifier (`57.0.22`); the docs warn that `Host colorScheme` "changes the sheet's content but not its background".
  - Android follows the `Host` Material theme (`MaterialExpressiveTheme`, `56.0.0`).
  - Passing our theme's `bgTertiary` as `containerColor` keeps us consistent either way.
- **Known styling bug.** iOS `presentationBackground` _materials_ render flat ([expo/expo#51135](https://github.com/expo/expo/issues/51135)). Solid colours work.

## 8. Accessibility

Expo's docs have **no accessibility section** for the sheet. What we know:

- The content is ordinary RN views, so our `accessibilityRole`/`accessibilityLabel` on the ✕ etc. carry over.
- iOS presents a native SwiftUI sheet (a UIKit presented view controller). Android presents M3 `ModalBottomSheet` in **its own dialog window** (Kotlin source comment in `ModalBottomSheetView.kt`; changelog `57.0.13`). So screen-reader focus should be confined to the sheet, as with any system modal. _This follows from the platform; check it with VoiceOver and TalkBack._
- Related fix: RN `Modal`s were missing from the iOS accessibility tree after a sheet was dismissed. Fixed in `57.0.5` (`#47708`).
- The universal props have no `accessibilityLabel` for the sheet itself. On iOS the web build gives a hidden "Bottom sheet" title, but there is no native equivalent. A visible title header (our requirement) covers the announcement.

## 9. Testing under `jest-expo` + RNTL

I checked this empirically: a throwaway test in `/tmp`, run with this repo's `jest-expo` preset (iOS platform by default) and `moduleNameMapper` pointing `@expo/ui` at the downloaded source. The repo's `node_modules` were untouched.

- The universal sheet **renders without a mock**. jest-expo falls back to a generic host component, `ViewManagerAdapter_ExpoUI`, that renders its children.
- `isPresented={false}` initially → nothing is rendered ✅.
- `isPresented` → children render, and `testID` lands on the native sheet node, so `getByTestId('calendar-day-sheet')` and `within(sheet).getByText(...)` work ✅.
- ❌ **Presses inside are swallowed.** `fireEvent.press` on a `Pressable` inside did nothing. The component's own `Host` has `pointerEvents="none"`, and RNTL respects that for every ancestor.
- ❌ **The content stays mounted after close.** Re-rendering with `isPresented={false}` left the content in the tree, because unmounting waits for the native `onDismiss` event, which never fires in Jest. On Android the same applies to `ref.hide()`, which never resolves.

**Impact on `app/(app)/(tabs)/calendar/__tests__/index.test.tsx`.** The assertions that the sheet disappears after closing (around line 394) and any press inside the sheet would fail without a mock.

**Recommendation:**

- Keep `testID="calendar-day-sheet"` on **our own** RN `View` inside the sheet, so it doesn't depend on Expo's placement (iOS puts it on the native sheet, Android on the Compose `Column`).
- Add a mock, either in a jest setup file or per test:

  ```ts
  jest.mock('@expo/ui', () => {
    const { View } = require('react-native');
    return {
      BottomSheet: ({ isPresented, children }: any) => (isPresented ? <View>{children}</View> : null),
      RNHostView: ({ children }: any) => children,
    };
  });
  ```

  With it, presses, open and close work as they do today. Dismissing via swipe, backdrop or back can't be simulated. Test the `onClose` wiring through the ✕, or call `onDismiss` from a mock prop.

- RNTL 14 needs `await render(...)` / `await fireEvent.press(...)`. The existing tests already do this.

## 10. Known issues

Open `expo/expo` issues that matter to us (searched 2026-10-09):

- [#51135](https://github.com/expo/expo/issues/51135): iOS `presentationBackground` materials render flat and opaque. Colours are fine.
- [#51297](https://github.com/expo/expo/issues/51297): iOS fit-to-content sheet content clipped on iPhone Duo / iOS 27.1 (reported on SDK 58). Not yet triaged.
- [#50694](https://github.com/expo/expo/issues/50694): `measure()` is wrong for an `RNHostView` nested in SwiftUI containers (iPad split view, SDK 58 preview). It affects mouse clicks. Low relevance.
- [#50555](https://github.com/expo/expo/issues/50555): feature request for back-press control on the drop-in. Its corner-radius half shipped in `57.0.21`.

Fixed in the SDK 57 line (relevant to RN 0.86 / Fabric):

- Android dev menu (Cmd+M) not opening while a sheet is open (`57.0.13`).
- iOS touch handler leaking across Fabric surfaces after dismiss (`57.0.5`).
- iOS hosted RN views not getting touches (`57.0.14`).
- The Reanimated measure crash (`57.0.22`).

No open issue is specific to RN 0.86 or the New Architecture. The general risk is churn: frequent fixes, and breaking changes in patch releases.

---

## Sketch for the wrapper

```tsx
// components/AppBottomSheet.tsx (iOS + default)
import { BottomSheet, RNHostView } from '@expo/ui';

export function AppBottomSheet({
  visible,
  onClose,
  title,
  children,
  testID,
}: Props) {
  const { width, height } = useWindowDimensions();
  return (
    <BottomSheet
      isPresented={visible}
      onDismiss={onClose}
      contentPadding={0}
      containerColor={theme.colors.bgTertiary}
    >
      <RNHostView matchContents>
        <View
          testID={testID}
          style={{ width, maxHeight: height * 0.7, padding: 16 }}
        >
          {(title || onClose) && (
            <SheetHeader title={title} onClose={onClose} />
          )}
          {children /* caller uses <ScrollView nestedScrollEnabled> */}
        </View>
      </RNHostView>
    </BottomSheet>
  );
}
// components/AppBottomSheet.android.tsx: same, but Compose ModalBottomSheet with
// skipPartiallyExpanded + ref.hide() on visible=false, if the ~50% partial opening is unwanted.
```

## Sources

- npm: `npm view @expo/ui dist-tags` → `sdk-57: 57.0.22`. Package source read from the 57.0.22 tarball, same as [expo/expo `packages/expo-ui`](https://github.com/expo/expo/tree/main/packages/expo-ui):
  - `src/universal/BottomSheet/{index.ios.tsx,index.android.tsx,index.tsx,types.ts}`
  - `src/swift-ui/BottomSheet/index.tsx`, `ios/BottomSheetView.swift`
  - `src/jetpack-compose/ModalBottomSheet/index.tsx`, `android/src/main/java/expo/modules/ui/ModalBottomSheetView.kt`
  - `src/community/bottom-sheet/*` (incl. README)
  - `CHANGELOG.md`
- Docs (SDK 57):
  - [Expo UI overview](https://docs.expo.dev/versions/v57.0.0/sdk/ui/)
  - [Universal BottomSheet](https://docs.expo.dev/versions/v57.0.0/sdk/ui/universal/bottomsheet/)
  - [SwiftUI BottomSheet](https://docs.expo.dev/versions/v57.0.0/sdk/ui/swift-ui/bottomsheet/)
  - [Compose ModalBottomSheet](https://docs.expo.dev/versions/v57.0.0/sdk/ui/jetpack-compose/bottomsheet/)
  - [Drop-in BottomSheet](https://docs.expo.dev/versions/v57.0.0/sdk/ui/drop-in-replacements/bottomsheet/)
- Repo: `node_modules/jest-expo/src/preset/setup.js` (`requireNativeViewManager` fallback), `node_modules/expo-modules-core/src/NativeViewManagerAdapter.native.tsx`.
- Issues: [#51135](https://github.com/expo/expo/issues/51135), [#51297](https://github.com/expo/expo/issues/51297), [#50694](https://github.com/expo/expo/issues/50694), [#50555](https://github.com/expo/expo/issues/50555).
