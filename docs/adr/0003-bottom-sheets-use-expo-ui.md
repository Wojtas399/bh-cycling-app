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
