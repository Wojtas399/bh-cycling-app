# Bottom sheets use Expo UI's BottomSheet behind our own primitive

## Status

Accepted

## Context

The Calendar day sheet was a hand-rolled React Native `Modal`. It had no swipe-to-dismiss and didn't feel native, and more sheets are expected. The project prefers Expo built-in features over third-party libraries and accepts the native platform look over pixel-matching our theme.

## Decision

All bottom sheets go through one primitive, `components/BottomSheet`, which wraps the universal `BottomSheet` from `@expo/ui`. It exposes a declarative `visible`/`onClose` API, an always-present ✕ with an optional title, and a content-sized body capped at 70% of the window height that scrolls when it overflows. Swipe-down, backdrop tap and Android back come from the native sheet.

Considered and rejected:

- `@gorhom/bottom-sheet`: a mature third-party library, but Expo UI meets every requirement, and the built-in preference wins.
- Native `formSheet` routes (Expo Router / react-native-screens): would turn sheets into routes, a bigger change than we need.
- Keeping the hand-rolled `Modal`: no swipe gesture and no native feel.

## Consequences

- Sheets look native rather than themed: platform-default corners, an iOS detent and an Android Material 3 sheet. We set only the background, drag indicator, Android scrim and a forced dark scheme on iOS.
- On Android, content taller than about half the screen first opens partly expanded, and the user drags it up. This is accepted as standard Material 3 behaviour.
- On iOS, swipe and backdrop-tap dismissal can't be configured separately.
- `@expo/ui` ships breaking changes in patch releases, so its version is pinned exactly and upgraded on purpose.
- Jest can't drive the native sheet, so tests use a shared `__mocks__/@expo/ui.tsx`.

## Amendment: full-height variant

Superseded by Note Details (#381). A Note now opens as its own pushed screen, so the primitive has lost `fullHeight` and `subtitle`, and every sheet is content-sized again, capped at 70% of the window. Kept below for the record.

The Note Detail Sheet shows a Note's text, which can be a long briefing. A sheet capped at 70% of the window is too cramped to read it, so the primitive gains a `fullHeight` variant for reading long content, and an optional `subtitle` line under the title. The content-sized body capped at 70% stays the default for every other sheet.

- `fullHeight` passes `snapPoints={['full']}` to the Expo UI sheet. On Android that skips the partly expanded state and fills the height. The body drops `RNHostView`'s `matchContents`, takes a fixed height (the window minus the top safe area), and scrolls in a `flex: 1` ScrollView.
- Dismissal is unchanged: swipe, backdrop tap, Android back and ✕.
- It is still a native modal, so it covers the tab bar. Sheets still don't stack; a screen moving from one sheet to another closes the first.

## Amendment: acting after a sheet has dismissed

Leaving the Calendar day sheet for another screen or sheet has to wait until it has fully closed. The Workout, Activity and Note screens otherwise slide in behind it, and iOS refuses to present another sheet, such as the Race sheet, over one still dismissing.

- The primitive gains an optional `onDismissed` callback, which fires once the sheet has left the screen, however it closed.
- The universal sheet has no such event, so `onDismissed` fires when the sheet's content unmounts. iOS unmounts it on the native dismiss, Android after `hide()` resolves.
- That Android unmount is not a documented guarantee, so an `@expo/ui` upgrade must re-check that tapping a day sheet tile still navigates.

## Amendment: system material on iOS 26

The Glass and Sheen restyle (#330) treats bottom sheets as floating chrome. On iOS 26 the system draws a sheet in Liquid Glass, and a painted background hides it.

- On iOS 26 the primitive sets no background and no per-sheet dark scheme, so the day and race sheets show the system glass material. They stay dark through the app-wide forced dark: `Appearance.setColorScheme('dark')` at startup, and `userInterfaceStyle: 'dark'` once a store build carries it. This replaces the first consequence's painted background and forced dark scheme on iOS 26.
- The system adapts its glass to Reduce Transparency and Increase Contrast, so the sheet doesn't read those settings.
- On Android and iOS below 26 the sheet is unchanged: the painted `bgTertiary` background, the Android scrim, and the forced dark scheme on iOS.
- Content on the sheet keeps its own surface. Item tiles stay Sheen on top of the glass.
