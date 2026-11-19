# Research: Toast mechanisms for Expo SDK 57

Ticket: [#72](https://github.com/Wojtas399/bh-cycling-app/issues/72) (map [#71 Wayfinder: Global Toast](https://github.com/Wojtas399/bh-cycling-app/issues/71)).
Date: 2026-10-10. This file records facts only. The choice is made in the follow-up grilling ticket.

Stack checked: `expo ~57.0.26`, `react-native 0.86.3`, `expo-router ~57.0.24`, `react-native-reanimated 4.5.1`, `react-native-worklets 0.10.1`, `react-native-screens ~4.26.0` (4.26.2 installed), `react-native-gesture-handler ~2.32.0`, `react-native-safe-area-context ~5.7.0`, `expo-haptics ~57.0.3`. `@expo/ui@57.0.21` is in `node_modules` only as a transitive dependency of `expo-router` (`npm ls @expo/ui`). It is not listed in `package.json`.

## TL;DR

- **Expo has no cross-platform Toast.** The only toast-like component in Expo is `@expo/ui/jetpack-compose` `SnackbarHost` / `Snackbar`, and it is **Android-only**. Expo UI has no SwiftUI or universal Toast, Snackbar, banner or HUD. Expo Router has no public Toast: `expo-router/build/views/Toast` is an internal dev-error view and is not exported.
- **Above native modals and sheets:** the iOS answer depends on _when_ the view gets attached to the window.
  - A root JS overlay, including one inside `FullWindowOverlay`, is attached once at mount. Sheets presented later sit above it, so it does **not** cover `formSheet` or the `@expo/ui` `BottomSheet` on iOS.
  - Burnt (SPIndicator) attaches at present time, and its README says it overlays native iOS modals.
  - On Android, `ToastAndroid` (and so Burnt on Android) is a system toast and appears above app dialogs. A JS overlay or a Compose `SnackbarHost` sits in the Activity window, so it is _under_ the `@expo/ui` `BottomSheet`, which is a Compose `ModalBottomSheet` in a Dialog window.
- **Imperative calls from outside React:** Burnt, sonner-native, react-native-toast-message and a custom store all support them. `ToastAndroid` does too, but it is Android-only. The Expo `SnackbarHost` only exposes a ref method, so a module-level call needs a ref-holder workaround.
- **No option meets every hard requirement and also covers native sheets on both platforms with themed three-variant visuals.** See the matrix at the end.

## 1. Expo built-ins

### 1a. `@expo/ui/jetpack-compose` `SnackbarHost` + `Snackbar` (Android only)

- **Platforms:** Android (and Expo Go). The docs page lists no iOS or web support. [Expo docs: Snackbar](https://docs.expo.dev/versions/latest/sdk/ui/jetpack-compose/snackbar/). It lives under `jetpack-compose` with no SwiftUI or universal counterpart. Checked against `node_modules/@expo/ui/src/{swift-ui,universal}` and the [Expo UI component index](https://docs.expo.dev/versions/latest/sdk/ui/).
- **API:** you mount `<SnackbarHost ref>` inside a Compose `Host`, then call `ref.current.showSnackbar({ message, actionLabel?, withDismissAction?, duration?: 'short'|'long'|'indefinite' })`, which returns `Promise<'actionPerformed'|'dismissed'>`. Source: `node_modules/@expo/ui/src/jetpack-compose/Snackbar/index.tsx`.
- **Imperative outside React:** not directly. The only trigger is a component ref. A module-level function would have to hold that ref (a module variable set by the root component), which is the same pattern react-native-toast-message uses internally.
- **Queueing:** "Subsequent calls queue and show after the current snackbar is dismissed." (JSDoc and Expo docs). It is backed by Compose `SnackbarHostState.showSnackbar`. Source: `node_modules/@expo/ui/android/src/main/java/expo/modules/ui/SnackbarView.kt`.
- **Variants and theming:** there is no variant or icon concept. The optional `<Snackbar>` child sets `containerColor`, `contentColor`, `actionContentColor`, `dismissActionContentColor`, `actionOnNewLine` and modifiers. These colours apply to every snackbar from that host, because the native side reads the child's props when it renders. Per-variant colour would mean changing the child's props before each call. That is not documented and not verified. The message is plain text only.
- **Layering:** it is a Compose view inside the React Native view tree (`ExpoComposeView`), so it renders where the `Host` is placed. If it is placed at the root after the `<Stack>`, it covers screens in the same window. It cannot cover Dialog-window surfaces such as `@expo/ui` `ModalBottomSheet` (see section 5).
- **Accessibility and haptics:** the Expo docs do not cover accessibility. It has no haptics hook, but `expo-haptics` can be called next to `showSnackbar`.
- **Build, testing and maintenance:** first-party and shipped with SDK 57. It needs the native `ExpoUI` module, which is already in the dev client through `expo-router`'s dependency. Adding it as a direct dependency would be explicit. It has no config plugin. In Jest it needs a mock because it uses `requireNativeView`.

### 1b. SwiftUI (`@expo/ui/swift-ui`)

The SDK 57 component list has no toast, banner or HUD. The closest components are `Alert` and `ConfirmationDialog`, which are blocking dialogs, plus `Overlay` and `Popover`. `Overlay` is a layout container that aligns content over a base view (`src/swift-ui/Overlay/index.tsx`). It is not a window-level presenter. [Expo UI index](https://docs.expo.dev/versions/latest/sdk/ui/).

### 1c. Expo Router and other `expo-*` packages

- `expo-router/build/views/Toast.{js,d.ts}` exports `Toast` / `ToastWrapper`. They are used only by the router's internal `EmptyRoute` / `SuspenseFallback` dev views and are not re-exported from the package entry.
- `@expo/ui` `universal` (18 components) has no toast.
- No other installed `expo-*` package exposes one: a grep of `node_modules/expo*/src` for toast or snackbar found nothing relevant.

### 1d. React Native `ToastAndroid` (reference)

- **Android only.** On iOS, `ToastAndroid.ios.js` is a fallback that does `console.warn('ToastAndroid is not supported on this platform.')`. Source: `node_modules/react-native/Libraries/Components/ToastAndroid/`.
- **Imperative and module-level:** `ToastAndroid.show(message, duration)`.
- **System toast** ([Android `Toast` reference](https://developer.android.com/reference/android/widget/Toast)):
  - It is drawn by the system above the app's windows, including dialogs and sheets.
  - Durations are only `LENGTH_SHORT` and `LENGTH_LONG`.
  - "for apps targeting API level 30 or higher, this method [`setGravity`] is a no-op when called on text toasts".
  - Custom views (`setView`) are deprecated.
  - Android 12+ limits text toasts to two lines.
  - "Snackbars are preferred for brief messages while the app is in the foreground."
- **Variants and theming:** none. It shows plain text with system styling, and Android 12+ shows the app icon. It cannot carry an icon or colour per variant.

## 2. Native-backed library: `burnt`

Sources: [README](https://github.com/nandorojo/burnt), `src/BurntModule.android.tsx`, `ios/BurntModule.swift`, `ios/Burnt.podspec`.

- **Version and maintenance:** latest `0.13.0`, published 2025-03-10. The last push to the repo was 2025-12-15. It has 21 open issues, including "Not working on android" (#55), "Not working as expected on Android" (#57), "`from` prop is not respected on Android" (#47), "Make types compatible with React 19" (#58) and "Bump iOS deployment target to 16.4 to match ExpoModulesCore" (#60). It depends on SPIndicator, whose last push was 2024-05-29.
- **Platforms:**
  - iOS wraps SPIndicator (toast) and SPAlert/AlertKit (alert).
  - **Android wraps `ToastAndroid`**: `ToastAndroid.showWithGravityAndOffset(title, ...)` only. `message`, `preset`, `haptic` and `icon` are ignored on Android, and gravity is a no-op on API 30+ (see section 1d).
  - Web wraps `sonner`.
  - The calls are the same on every platform, but what appears differs a lot between them.
- **API:** `Burnt.toast({ title, message?, preset: 'done'|'error'|'none'|'custom', haptic: 'none'|'success'|'warning'|'error', duration, shouldDismissByDrag, from: 'top'|'bottom', layout, icon: { ios: { name: SFSymbol, color } } })`.
  - There is no `warning` preset. A warning would need `preset: 'custom'` with an SF Symbol and colour (iOS only).
  - SPIndicator's built-in animated presets are only `done` and `error`.
- **Imperative outside React:** yes. It is a plain module function and needs no provider.
- **Above navigator and modals:** README: "Overlays on top of native iOS modals"; "Displaying toasts on top of modals has always been an issue in React Native. With Burnt, this works out of the box." On Android it is a system toast, so it shows above dialogs. It persists across navigation because it is not part of the React tree.
- **Theming:** iOS uses the system SPIndicator look (blurred pill, title and message, icon and tint colour). The background colour cannot be set: issue #36 asks for it and is still open. Android uses the system toast look. Neither can be matched to the Restyle theme beyond the icon colour on iOS.
- **Multiple toasts:** this is not documented by Burnt or SPIndicator. Android system toasts are queued by the OS.
- **Accessibility and haptics:** haptics are built in on iOS (`haptic`). Burnt does not document screen-reader announcements. Android system toasts are announced by TalkBack.
- **Build and testing:** it is an Expo module with a native iOS pod (`SPIndicator ~> 1.6`, `SPAlert ~> 4.2`). It needs a dev-client rebuild (`npx expo prebuild`) and does not run in Expo Go. The README also tells you to install `expo-build-properties`, which is already installed. The README says it works with both the old and new architectures ("built on top of JSI, thanks to Expo's new module system"). In Jest you `jest.mock('burnt')`.

## 3. JS-rendered libraries

### 3a. `sonner-native`

Sources: [README](https://github.com/gunnartorfis/sonner-native), [docs: Toaster](https://github.com/gunnartorfis/sonner-native/blob/main/docs/docs/Toaster.md), [toast](https://github.com/gunnartorfis/sonner-native/blob/main/docs/docs/toast.md), [multiple toasters](https://github.com/gunnartorfis/sonner-native/blob/main/docs/docs/multiple-toasters.md). npm metadata comes from `npm view`.

- **Version and maintenance:** `0.27.0`, published 2026-08-15, and actively maintained.
- **Peer dependencies:** `react-native-reanimated ^4.1.1`, `react-native-worklets >=0.6.1`, `react-native-gesture-handler >=2.28.0`, `react-native-safe-area-context ^5.6.0`, `react-native-screens ^4.16.0`, `react-native-svg ^15.12.1`.
  - **`react-native-svg` is not installed in this app**, so adding sonner-native means a new native dependency and a dev-client rebuild.
  - Everything else is already installed at compatible versions.
- **Platforms:** iOS and Android with the same API. It is plain JS on top of Reanimated.
- **API:** `toast(msg)`, `toast.success(msg)`, `toast.error(msg)`, `toast.warning(msg)`, `toast.promise`, `toast.custom`, `toast.dismiss(id?)`, `toast.wiggle(id)`, plus per-toast `duration`, `onDismiss` and `onAutoClose`. "Works outside of React components." The three variants we need exist out of the box, each with its own default icon.
- **Root placement and navigation:** you put `<Toaster />` in `app/_layout.tsx` (the docs show this for Expo Router). It sits outside the navigator, so toasts persist across `router.back()`.
- **Above modals and sheets:**
  - On iOS the root Toaster is wrapped in `FullWindowOverlay` by default; on Android it is a plain `View`.
  - The docs say: "A natively presented sheet ... is presented **above** that window's content, so the root Toaster can never appear over it". For toasts inside a sheet you add a second `<Toaster id="sheet" fullWindowOverlay={false} />` inside the sheet and call `toast(msg, { toasterId: 'sheet' })`.
  - A third-party `ToasterOverlayWrapper` (for example `react-native-z-view`) is also supported.
- **Theming:** `theme: 'light'|'dark'`, `style` and `toastOptions` (default styles, plus per-variant styles), `icons` (replaces the default icons), `toastOptions.backgroundComponent`, `richColors`, `position`, `offset`, `animation` (custom Reanimated entering and exiting animations), `allowFontScaling`. Restyle tokens can be passed in through these style props.
- **Multiple toasts:** by default toasts are listed with `visibleToasts = 3`, and overflow fades out. `enableStacking` stacks them behind the front toast instead. To get single-message behaviour you would set `visibleToasts={1}` or call `toast.dismiss()` before each toast. Neither is documented as a "single" mode.
- **Accessibility and haptics:** the current source (`src/toast.tsx`, `src/toaster.tsx`, `src/toast-content.tsx`) has no explicit `AccessibilityInfo.announceForAccessibility` and no live-region usage. On iOS the `FullWindowOverlay` native side posts `UIAccessibilityLayoutChangedNotification` when it attaches (`RNSFullWindowOverlay.mm`). It has no haptics, but a wrapper can call `expo-haptics`.
- **Testing:** the package ships no Jest mock. `jest.mock('sonner-native', () => ({ toast: Object.assign(jest.fn(), { success: jest.fn(), error: jest.fn(), warning: jest.fn(), dismiss: jest.fn() }), Toaster: () => null }))` is straightforward. It has no config plugin, but adding `react-native-svg` means a rebuild.

### 3b. `react-native-toast-message`

Sources: [README](https://github.com/calintamas/react-native-toast-message), [docs/api.md](https://github.com/calintamas/react-native-toast-message/blob/main/docs/api.md), [modal-usage.md](https://github.com/calintamas/react-native-toast-message/blob/main/docs/modal-usage.md), [navigation-usage.md](https://github.com/calintamas/react-native-toast-message/blob/main/docs/navigation-usage.md), [jest-testing.md](https://github.com/calintamas/react-native-toast-message/blob/main/docs/jest-testing.md), `src/useToast.ts`.

- **Version and maintenance:** `2.5.2`, with registry activity on 2026-09-08. Its only peer dependencies are `react` and `react-native`. It is pure JS with no native code, so no rebuild is needed.
- **API:** `Toast.show({ type, text1, text2, position, visibilityTime, autoHide, onShow, onHide, onPress, props })` and `Toast.hide()`. It is an imperative static object, so it can be called from anywhere once a `<Toast />` is mounted.
- **Variants and theming:** the built-in types are `success`, `error` and `info`. **There is no built-in `warning`**, but the `config` prop lets you define or replace any type with your own component, which gives full Restyle theming.
- **Root placement:** you render `<Toast />` as the last child next to the navigator. It persists across navigation.
- **Above modals:** "the only way to show something on top of the modal is to render it inside the Modal itself". The same applies to a native stack `presentation: 'modal'`, where you need one `<Toast />` instance per modal. "whichever `<Toast />` instance last had its `ref` set will be used".
- **Multiple toasts:** one toast at a time. `src/useToast.ts` contains `// TODO: use a queue when Toast is already visible`, so a new `show` replaces the current toast.
- **Accessibility and haptics:** nothing is documented and it has no haptics. The custom layouts you write could add them.
- **Testing:** an official recipe: `jest.mock('react-native-toast-message', () => ({ show: jest.fn(), hide: jest.fn() }))`.

## 4. Custom Reanimated component: what it would take

All of this is built from primitives that are already installed.

- **Module store:** a module-level store (a plain subscribe/getSnapshot object) with `showToast({ type, message })` that replaces the current toast or queues it. A `<ToastHost />` in `app/_layout.tsx` after `<Stack>` reads it with `useSyncExternalStore`. This meets the "imperative, module-level" and "persists across navigation" requirements, and the store is pure TypeScript, which suits the business-logic-only testing rule.
- **Animation:** Reanimated 4.5 `entering` / `exiting` layout animations (or shared values), with a timer for auto-dismiss.
- **Theming:** Restyle tokens and `@expo/vector-icons` / `expo-symbols` icons per variant.
- **Accessibility:**
  - Call `AccessibilityInfo.announceForAccessibility(message)` when a toast shows.
  - On Android, `accessibilityLiveRegion="polite"` on the container.
  - The host must not steal touches (`pointerEvents="box-none"`).
- **Haptics:** call `Haptics.notificationAsync(Success|Warning|Error)` from `expo-haptics` inside `showToast`.
- **Layering:**
  - iOS: optionally wrap the host in `FullWindowOverlay` from `react-native-screens` (installed). It has the same limitation as sonner-native: it attaches its container to the window once at mount (`maybeShow` → `[window addSubview:_container]`, `RNSFullWindowOverlay.mm`), so sheets presented afterwards are above it.
  - Android: `FullWindowOverlay` is iOS-only and logs a warning on Android (`FullWindowOverlay.tsx`). A sibling `View` placed after the navigator covers stack screens but not Dialog windows.
- **Cost:** about one host component plus one store module. There is no new native code and no rebuild.

## 5. Layering facts: what is "above" what

| Surface                                       | How it is hosted (source)                                                                                                                                                                        | Root JS overlay / `FullWindowOverlay`                                                                                                   | Burnt / SPIndicator (iOS)                             | `ToastAndroid` (Android) |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- | ------------------------ |
| Expo Router stack screens and `router.back()` | RNS screens inside the root view                                                                                                                                                                 | Above, if rendered after `<Stack>`                                                                                                      | Above                                                 | Above                    |
| iOS `presentation: 'modal'` / `formSheet`     | RNS presents a separate `UIViewController`, which UIKit adds to the window _after_ the overlay                                                                                                   | **Below.** The sonner-native docs say a root toaster "can never appear over" a natively presented sheet. RNS `maybeShow` attaches once. | Above (README claim)                                  | n/a                      |
| iOS `@expo/ui` `BottomSheet`                  | SwiftUI `.sheet` via `SwiftUIBottomSheet` (`src/universal/BottomSheet/index.ios.tsx`), presented in its own view controller (`PresentedContent` comment in `src/swift-ui/BottomSheet/index.tsx`) | **Below** (same reason)                                                                                                                 | Above (README claim, not verified for SwiftUI sheets) | n/a                      |
| Android `formSheet` (RNS 4.26)                | `BottomSheetBehavior` on the `Screen` inside `ScreenStackFragment`. The legacy `ScreenModalFragment` dialog is not instantiated (no constructor call found).                                     | Likely above if rendered after `<Stack>`, because it is the same window. Not verified on a device.                                      | n/a                                                   | Above (system toast)     |
| Android `@expo/ui` `BottomSheet`              | Compose `ModalBottomSheet` in a Dialog window (`ModalBottomSheetView.kt` uses `DialogWindowProvider`)                                                                                            | **Below** (Activity window is under the Dialog window); this applies to the Compose `SnackbarHost` too                                  | n/a                                                   | Above (system toast)     |
| RN `<Modal>` (current `CalendarDaySheet`)     | Separate native window/dialog (react-native-toast-message `modal-usage.md`)                                                                                                                      | Below                                                                                                                                   | Above on iOS (README)                                 | Above                    |

Note: today the app has no Expo Router `presentation` modals. Its only sheet is `components/calendar/CalendarDaySheet.tsx`, which uses an RN `<Modal>` and is being migrated to the `@expo/ui` `BottomSheet` in [#69](https://github.com/Wojtas399/bh-cycling-app/issues/69).

## 6. Requirements matrix

Hard requirements from #71: iOS + Android; module-level imperative API; root-level and persists across navigation; three variants (success / warning / error); single message string; non-interactive.

| Option                            | iOS + Android same API                                             | Imperative, module-level      | Persists across `router.back()` | 3 variants with icon/colour                                               | Restyle theming                         | Above native sheets (iOS / Android `@expo/ui` BottomSheet) | Multiple toasts             | Native rebuild                           | Jest                              |
| --------------------------------- | ------------------------------------------------------------------ | ----------------------------- | ------------------------------- | ------------------------------------------------------------------------- | --------------------------------------- | ---------------------------------------------------------- | --------------------------- | ---------------------------------------- | --------------------------------- |
| `@expo/ui` Compose `SnackbarHost` | **No (Android only)**                                              | Ref only (needs a ref-holder) | Yes if at root                  | No variants; one colour set per host                                      | Colours only                            | n/a / No                                                   | Queue                       | No (already in the tree via expo-router) | Mock needed                       |
| `ToastAndroid`                    | **No (Android only)**                                              | Yes                           | Yes                             | **No** (plain text)                                                       | No                                      | n/a / Yes                                                  | OS queue                    | No                                       | Mock RN module                    |
| `burnt`                           | Same calls, very different output (Android = plain `ToastAndroid`) | Yes                           | Yes                             | iOS: done/error presets + custom SF Symbol for warning; **Android: none** | No (system look)                        | Yes / Yes                                                  | Not documented              | Yes (pods)                               | `jest.mock('burnt')`              |
| `sonner-native`                   | Yes                                                                | Yes                           | Yes                             | Yes (`success`/`warning`/`error`)                                         | Yes (style, icons, backgroundComponent) | **No** by default (needs a per-sheet `<Toaster id>`) / No  | List up to 3 (configurable) | Yes (adds `react-native-svg`)            | Hand-written mock                 |
| `react-native-toast-message`      | Yes                                                                | Yes                           | Yes                             | success/error built in; warning via `config`                              | Yes (custom layouts)                    | **No** (needs an instance inside each modal) / No          | Replace (one at a time)     | No                                       | Official mock recipe              |
| Custom Reanimated host            | Yes                                                                | Yes                           | Yes                             | Yes (you build it)                                                        | Yes                                     | **No** (same as JS overlays) / No                          | Your choice                 | No                                       | Pure-TS store, trivially testable |

**Options that meet every hard requirement (cross-platform, imperative module-level API, persists across navigation, three distinguishable variants):** `sonner-native`, `react-native-toast-message` (warning through a custom type) and a custom Reanimated host. **None of these three renders above iOS native sheets or the Android `@expo/ui` `BottomSheet` from a single root host.** The only options that do are Burnt on iOS and `ToastAndroid` on Android, and Burnt fails the three-variant requirement on Android. **No Expo built-in meets the iOS requirement.**

Open points for the grilling ticket, none of them verified on a device:

- Whether showing a toast while a sheet is open is a real use case. If it is, either the sheet hosts its own toast surface, or the toast is shown after the sheet dismisses.
- Android `formSheet` layering on a real device.
- How Burnt behaves over SwiftUI `.sheet` presentations specifically.
