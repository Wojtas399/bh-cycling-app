# Research: third-party Toast library shortlist (no native code of our own)

Follow-up to `docs/research/toast-mechanisms.md` (branch `research/toast-mechanisms`) and `docs/research/toast-above-everything.md` (branch `research/toast-above-everything`). Those docs are not repeated here. Where this doc corrects them, it says so.
Date: 2026-10-11. Facts only. No choice is made here.

Stack: `react-native 0.86.3` (New Architecture), `expo ~57`, `react-native-screens 4.26.2`, `react-native-reanimated 4.5.1`, `react-native-gesture-handler ~2.32`. `app.config.ts` sets `expo-build-properties` `ios.useFrameworks: 'static'` and `enableSceneSupport: true` (UIScene lifecycle). `main` now uses the `@expo/ui` `BottomSheet` for the calendar day (#70).

How sources were read: package tarballs from `npm pack` (latest versions on 2026-10-11), GitHub repos, issues and PRs through `gh`, and npm registry and download APIs (`api.npmjs.org/downloads/point/last-week/<pkg>`, week 2026-10-04 to 2026-10-10).

Requirements, in priority order:

1. Visible above native sheets and modals on iOS and Android, ideally above the keyboard too.
2. Touches pass through.
3. success/warning/error variants with a customisable icon and colour.
4. Imperative module-level API that persists across navigation.
5. Maintained, New Architecture, Expo-friendly and mockable in Jest.

## TL;DR

- **Task A is resolved, and it corrects both earlier docs.**
  - `react-native-screens` installs a category on `UIWindow` that overrides `didAddSubview:`. Whenever _any_ other subview is added to a window, the category brings every `RNSFullWindowOverlayContainer` back to the front (`ios/UIWindow+RNScreens.mm`, 4.26.2).
  - A native presentation (RNS modal/formSheet, RN `<Modal>`, and by the same UIKit path a SwiftUI `.sheet`) adds a new `UITransitionView` to the window. So a `FullWindowOverlay` (FWO) **that is always mounted is pushed back above sheets presented after it**, not only those presented before it.
  - RNS's own test `Test1096` is built this way: an always-mounted FWO, then an RN `<Modal pageSheet>` or native-stack `presentation: 'modal'` opened afterwards.
  - react-native-notifier's README claim therefore holds **on iOS** for sheets opened before _and_ after the toast. It holds only inside the app's main window, so it does not cover the keyboard.
  - On **Android** notifier's FWO is a plain `View`, which is below every Dialog window (RN `<Modal>`, `@expo/ui` `BottomSheet`).
  - The sonner-native docs say the opposite ("the root Toaster can never appear over" a native sheet). That conflicts with the RNS source and was **not verified on a device** here.
- **No maintained package with custom styling renders above Android Dialog windows.**
  - The only packages that reach above a Dialog window on Android are:
    - system `Toast` (Burnt, simple-toast): no styling;
    - RN `<Modal>` hosts (toastify): blocks touches;
    - `@baronha/ting` (an EasyWindow `TYPE_APPLICATION` window): unmaintained since 2024-11, with crash reports;
    - `react-native-z-view` (a WindowManager window): not a toast, unmaintained since 2023, legacy Android ViewManager.
  - The maintained native-backed newcomers (`react-native-nitro-toast`, `react-native-pretty-toast`) add their view to the Activity `decorView`, which is **below Dialog windows**. nitro-toast's maintainer confirms this is by design (issue #12).
- **On iOS, three maintained routes reach above every sheet:**
  - sonner-native (FWO, mounted only while toasts show);
  - react-native-notifier (always-mounted FWO, but last stable release 2024-07);
  - react-native-nitro-toast (a separate `UIWindow` at `.alert + 1`, which does not depend on order).
- **Ranked top 3 (section 5):** 1. sonner-native, 2. react-native-nitro-toast, 3. react-native-notifier. **All three miss requirement 1 on Android for RN `<Modal>` and the `@expo/ui` `BottomSheet`.** They meet it for Expo Router `modal`/`formSheet` on Android, which are in-window (see the earlier research).

## A. react-native-notifier: does the "above modals" claim hold?

Sources:

- `react-native-notifier@2.0.0` tarball: `src/components/FullWindowOverlay.tsx`, `src/Notifier.tsx`, `src/Notifier.styles.ts`, README.
- `react-native-screens@4.26.2`, `@4.18.0` and `@3.31.1` tarballs: `ios/RNSFullWindowOverlay.mm`, `ios/UIWindow+RNScreens.mm`.
- RNS `apps/src/tests/issue-tests/Test1096.tsx` (main), RNS PRs #1096, #3379, #3553 and #2733, and notifier issues #94, #95 and #71.

**Mechanism.**

- `useRNScreensOverlay` makes `Notifier.render()` wrap its content in RNS `<FullWindowOverlay><View style={rnScreensOverlayViewStyle}>…</View></FullWindowOverlay>`. This happens on iOS only: `if (Platform.OS !== 'ios' || !useOverlay || !RNScreenFullWindowOverlay) return children;`.
- `render()` always returns the FWO, so it is **mounted for as long as `NotifierWrapper`/`NotifierRoot` is mounted**, not per notification.
- FWO 4.26.2 `maybeShow` adds its container with `[window addSubview:_container]` from `didMoveToWindow` and `didMoveToSuperview`. It has no `zPosition` or `windowLevel`.
- **What keeps it on top** is `ios/UIWindow+RNScreens.mm`:
  ```objc
  @implementation UIWindow (RNScreens)
  - (void)didAddSubview:(UIView *)subview {
    if (![subview isKindOfClass:[RNSFullWindowOverlayContainer class]]) {
      for (UIView *view in self.subviews) {
        if ([view isKindOfClass:[RNSFullWindowOverlayContainer class]]) {
          [self bringSubviewToFront:view];
        }
      }
    }
  }
  @end
  ```
  RNS PR #1096, which introduced FWO, describes it as "Removed the necessity of adding changes to `AppDelegate.m` by providing an extension of `UIWindow` in the package." When a modal or sheet is presented, its `UITransitionView` is added to the window. RNS PR #3553 describes this for `fullScreenModal`: "Separate `UITransitionView` is created and attached at higher index under `UIWindow`". `didAddSubview:` then fires and the FWO container is brought back to the front.

**Does it hold for sheets opened before and after the toast (iOS)?**

- **After:** yes, by the category above. `Test1096` mounts the FWO permanently in `Home` and then opens an RN `<Modal presentationStyle="pageSheet">` and a native-stack `presentation: 'modal'`. The notifier maintainer's screenshot in issue #95 (2024-07-21, Expo 51) shows the notification above a native-stack modal with the always-mounted FWO.
- **Before:** yes. Mounting adds the container after the existing transition view, and the RNS #3521 reporter wrote "No problem with `presentation: 'modal'`".
- **`fullScreenModal`:** the presenting hierarchy is detached. RNS ≤4.18 failed this case and PR #3553 fixed it in 4.19+, so 4.26.2 has the fix.
- **SwiftUI `.sheet` (`@expo/ui` `BottomSheet`):** not tested anywhere found. The same mechanism applies only if UIKit adds the sheet's transition view as a direct subview of the app's window, which is the normal UIKit presentation path. This is an inference.
- **Not covered:** anything in another `UIWindow`. That includes the keyboard window and system alerts.
- **Conflicting evidence:**
  - The sonner-native docs (`docs/docs/multiple-toasters.md`) say "A natively presented sheet … is presented above that window's content, so the root Toaster can never appear over it". They cite TrueSheet.
  - TrueSheet's own docs (`docs/content/docs/latest/guides/overlays.mdx`) recommend `FullWindowOverlay` on iOS to get above TrueSheet.
  - No device check was done here. **Treat iOS "above sheets opened after" as source-backed but unverified on device.**

**Android.** `FullWindowOverlay.tsx` returns `children` unchanged. The notifier is an absolutely positioned `Animated.View` in the Activity window. That puts it above in-window RNS screens, including Android `modal` and `formSheet` (in-window per the earlier research), but **below RN `<Modal>` and the Compose `ModalBottomSheet` Dialog windows**. RNS has no Android FWO: PR #2733 was closed, and the maintainer note says "if I presented the FWO component as Dialog, any other Dialog presented afterwards would be displayed above FWO overlay".

**Touch pass-through.**

- The container style is `position: absolute, top: 0, width: '100%'` (`Notifier.styles.ts`), so it only covers the notification's own area.
- On iOS the FWO container's `pointInside` returns YES only over interaction-enabled subviews (see the earlier research). Touches outside the banner pass through.
- The banner itself is tappable (`TouchableWithoutFeedback`) and swipeable (RNGH `PanGestureHandler`).
- Issue #95 notes that RNGH inside an FWO needs a `GestureHandlerRootView`. The `rnScreensOverlayViewStyle` prop exists for that wrapper view.

**Other facts.**

- Variants: the built-in `Alert` component has `alertType: 'success'|'error'|'warn'|'info'` (red, green, orange, blue) and a `backgroundColor` override. You can also pass any custom `Component`, which allows a Restyle-themed one.
- API: `Notifier.showNotification(params)` and `Notifier.hideNotification()` are module-level. Queue modes are `reset`, `next`, `immediate` and `standby`.
- Animation uses RN `Animated` (not Reanimated).
- Peer dependencies: `react-native-gesture-handler` (installed). `3.0.0-rc.5` also needs `react-native-safe-area-context`.
- Maintenance:
  - **Latest stable `2.0.0` was published 2024-07-21.** `3.0.0-rc.5` is a prerelease from 2025-01-21, and the repo was last pushed on 2025-03-17. The earlier doc's "2.0.0 (2025-03)" mixed up these two dates.
  - The repo has 1,435★ and 19 open issues.
  - Downloads: 15,464 per week.
- Pure JS: it needs no rebuild and is easy to mock in Jest.

## B. Packages searched (beyond the earlier docs)

npm searches: "toast window", "toast modal native", "expo toast", "toast uiwindow", "toast above modal", "toast nitro", "snackbar native", "toast overlay native", "react-native toast", "full window overlay", "z-view", "react-native portal window", "toast swiftui compose", "react native toast sheet". GitHub code search: Kotlin `TYPE_APPLICATION toast`. It found no React Native package beyond those listed below.

| Package (latest, published)                                            | Kind                                 | iOS mechanism                                                                                                                                                 | Android mechanism                                                                                                                                                                   | Verdict for this app                                                                                                                                                                           |
| ---------------------------------------------------------------------- | ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **react-native-nitro-toast** 1.4.0 (2026-06-09)                        | Nitro module, SwiftUI / Compose      | Separate `PassthroughWindow` (`UIWindow(windowScene:)`), `windowLevel = .alert + 1`, `isHidden = false`, no `makeKey` (`ios/ViewModels/ToastViewModel.swift`) | `ComposeView` added to `activity.window.decorView` (`ToastManager.kt` `ensureToastContainer`)                                                                                       | **Candidate.** iOS above everything except keyboard and system windows. Android below Dialogs.                                                                                                 |
| **react-native-pretty-toast** 1.0.3 (2026-08-29, repo created 2026-04) | Fabric view + native managers        | Separate `PassThroughWindow` at default level (`.normal`), **calls `makeKey()` on every show** (`ToastManager.swift`)                                         | `PassThroughFrameLayout` added to `decorView` (`ToastOverlay.kt` `ensureOverlay`)                                                                                                   | Android below Dialogs. Fixed black "Dynamic Island" pill, background not customisable. Hides the status bar while showing.                                                                     |
| **@baronha/ting** 1.2.3 (2024-11-10)                                   | TurboModule                          | Vendored SPIndicator: `UIApplication.shared.keyWindow.addSubview` at show time                                                                                | EasyWindow 10.62: `WindowManager.addView`, default `TYPE_APPLICATION`, `FLAG_NOT_TOUCH_MODAL \| FLAG_NOT_FOCUSABLE`, `WRAP_CONTENT`, added at show time                             | **Only package found with custom styling above Android Dialogs** (opened before the toast). Unmaintained, with crash reports (below).                                                          |
| **react-native-snackbar** 3.0.1 (2026-02-27)                           | TurboModule, Material Snackbar       | `[[UIApplication sharedApplication] delegate].window addSubview:` at show time (`RNSnackBarView.mm`)                                                          | `Snackbar.make` on `android.R.id.content`. If the main window has no focus, it walks the tree for `ReactModalHostView` and attaches inside the last RN Modal (`SnackbarModule.kt`). | No icons, so it fails requirement 3. It handles RN Modal on Android but not Compose Dialogs. `delegate.window` under the UIScene lifecycle is unverified.                                      |
| react-native-z-view 0.2.4 (2023-09-01)                                 | Container, not a toast               | Wraps RNS `FullWindowOverlay` (`z-view.ios.tsx`)                                                                                                              | Legacy `ViewManager`. `WindowManager.addView` when the first child is added (`ZView.java`), `touchable={false}` sets `FLAG_NOT_TOUCHABLE`                                           | Usable as sonner-native's `ToasterOverlayWrapper`. Unmaintained (last push 2023-10). Issue #10 (2025-07) reports "Library is not linked" in a current Expo project, with no reply.             |
| TrueSheet `TrueSheetOverlay` (4.0.0-beta only)                         | Part of a sheet library              | Container added to the window, with `bringOverlaysToFrontInWindow` (`ios/TrueSheetOverlayView.mm`)                                                            | Attached to the Activity content view (`TrueSheetOverlayView.kt` docs)                                                                                                              | Its own docs list the limitation: "Native modals presented after the overlay — React Native's `Modal`, native-stack modal screens — render above it". Beta. Not relevant to `@expo/ui` sheets. |
| react-native-toast-hybrid 3.2.0 (2026-02-28)                           | HUD                                  | `HBDProgressHUD`                                                                                                                                              | `KProgressHUD` (`Theme.HUD.FullScreenDialog`)                                                                                                                                       | A loading/HUD library, not a toast. 56 downloads per week.                                                                                                                                     |
| react-native-alert-notification 0.4.2 (2024-11)                        | JS                                   | In-tree toast. Its `Dialog` uses RN `<Modal>`.                                                                                                                | Same                                                                                                                                                                                | Toast is under sheets. Stale.                                                                                                                                                                  |
| react-native-toast-lite 2.0.5 (2025-08)                                | JS (zustand, svg, render-html peers) | In-tree                                                                                                                                                       | In-tree                                                                                                                                                                             | Under sheets. 45 downloads per week.                                                                                                                                                           |
| react-native-toast-notifications 3.4.0 (2023-08)                       | JS                                   | In-tree                                                                                                                                                       | In-tree                                                                                                                                                                             | Under sheets (covered earlier). Stale.                                                                                                                                                         |
| react-native-notificated 0.1.7 (2024-10)                               | JS                                   | In-tree                                                                                                                                                       | In-tree                                                                                                                                                                             | Reanimated peer `^2 \|\| ^3`, not 4.                                                                                                                                                           |
| @gorhom/portal 1.0.14 (2022-06)                                        | JS portal                            | Same React root                                                                                                                                               | Same                                                                                                                                                                                | No separate window.                                                                                                                                                                            |
| react-native-teleport 1.2.2 (2026-09)                                  | Native portal                        | Covered earlier: not a separate window                                                                                                                        | Same                                                                                                                                                                                | Not a toast.                                                                                                                                                                                   |
| react-native-custom-toast-nitro 0.1.5 (2025-09)                        | Nitro                                | n/a                                                                                                                                                           | n/a                                                                                                                                                                                 | 0 downloads per week, pinned `nitro-modules 0.29.4`. Not inspected further.                                                                                                                    |

**Built-ins checked again.**

- `react-native-screens`: `latest` is 4.29.0 and `next` is 5.0.0-alpha.3. The `main` tree has no new overlay, window or portal component outside `src/legacy` (where FWO now lives). The only directories under `src/components` are `modals`, `split`, `stack`, `tabs` and helpers.
- Expo Router and `@expo/ui` SDK 57: nothing new beyond the earlier doc. That means only the Android-only Compose `SnackbarHost` and the internal, unexported `expo-router/build/views/Toast`.

### B1. `@baronha/ting` in detail (the only Android-Dialog-capable styled option)

- **Android** (`android/src/main/java/com/ting/TingModule.kt` + `com.github.getActivity:EasyWindow:10.62`):
  - `EasyWindow(Activity)` uses a default `WindowManager.LayoutParams()` (so `TYPE_APPLICATION` on the Activity token) with `FLAG_NOT_TOUCH_MODAL | FLAG_NOT_FOCUSABLE`, `WRAP_CONTENT` and `TRANSLUCENT`.
  - `toast()` calls `toastWindow.cancel()` and then `.show()`, which calls `mWindowManager.addView`. The window is added at show time, so (by the AOSP ordering in the earlier research) it is **above Dialogs already open**, and a Dialog opened _during_ the toast covers it.
  - `FLAG_NOT_FOCUSABLE` means it is "Z-ordered on top of the input method" (AOSP `WindowManager.LayoutParams` doc), so it is above the keyboard.
  - The window is only the size of the toast. Touches outside it reach the app (`NOT_TOUCH_MODAL`). The toast itself takes touches.
- **iOS:** SPIndicator `present` does `presentWindow = UIApplication.shared.keyWindow` and then `window.addSubview(self)`. That puts it above sheets already presented. A sheet presented during the toast covers it, because the RNS category only lifts FWO containers.
- **Styling:**
  - Options are `backgroundColor`, `titleColor`, `messageColor`, `icon: { uri | require(), size, tintColor }`, `position`, `duration` and `haptic`, on both platforms.
  - The presets are only `done`, `error`, `none` and `spinner`. A warning needs a custom icon.
  - `setup({ toast })` sets global defaults.
- **Imperative:** `toast(options)` is a module function.
- **Reliability and maintenance:**
  - The repo was last pushed 2024-11-10, with 368★ and 18 open issues. Downloads: 402 per week.
  - The module creates both `EasyWindow`s **once, in field initialisers, from `currentActivity`**. EasyWindow's `ActivityWindowLifecycle.onActivityDestroyed` → `recycle()` sets `mDecorView = null`, so the next `setContentView` throws. This matches open issue #40: "NullPointerException … `ViewGroup.getChildCount()` … `EasyWindow.setContentView` … `TingModule`".
  - Further open issues: #31 (Android NPE in production), #43 (`BitmapDrawable cannot be cast to GradientDrawable`), #42 ("[IOS] App crashes when calling toast() in react-native@0.77", no body), and #15/#19 (`'ting-Swift.h' file not found` with `useFrameworks: 'static'`, which **this app uses**; users report patching `Ting.mm`).

## C. Serious candidates: per-requirement facts

Abbreviations: "Dialogs" means Android Dialog windows (RN `<Modal>` and the `@expo/ui` `BottomSheet` = Compose `ModalBottomSheet`). "In-window" means Expo Router `modal`/`formSheet` on Android.

|                                                       | sonner-native 0.27.0                                                                                                                                                | react-native-nitro-toast 1.4.0                                                                                                                                     | react-native-notifier 2.0.0 (`useRNScreensOverlay`)                              | @baronha/ting 1.2.3                                                                            | react-native-pretty-toast 1.0.3                                                                                                      |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| iOS mechanism                                         | RNS FWO, **mounted only while toasts are visible** (`toaster.tsx`: `shouldShowOverlay` → `<FullWindowOverlay>`; `toast-store.ts` hides it after the exit animation) | Own `UIWindow`, `.alert + 1`                                                                                                                                       | RNS FWO, always mounted                                                          | SPIndicator `keyWindow.addSubview` at show                                                     | Own `UIWindow`, `.normal`, `makeKey()` on show                                                                                       |
| iOS: above sheets opened **before** the toast         | Yes (added after the transition view, then kept on top by the RNS category)                                                                                         | Yes (window level)                                                                                                                                                 | Yes                                                                              | Yes                                                                                            | Yes, in practice (a newer visible window at the same level; Apple: "ordering … within a given window level is not guaranteed")       |
| iOS: above sheets opened **after** the toast          | Yes per RNS `didAddSubview:` source. **Conflicts with sonner's own docs.** Unverified on device.                                                                    | Yes (window level, order-independent)                                                                                                                              | Yes per RNS source, `Test1096` and the maintainer's screenshot. Unverified here. | No                                                                                             | Same as "before"                                                                                                                     |
| iOS: SwiftUI `.sheet` (`@expo/ui` `BottomSheet`)      | Inferred yes (same window). Not tested.                                                                                                                             | Yes (separate window)                                                                                                                                              | Inferred yes. Not tested.                                                        | Before only                                                                                    | Yes                                                                                                                                  |
| iOS: keyboard                                         | Below (keyboard has its own window)                                                                                                                                 | Below (keyboard window level is higher)                                                                                                                            | Below                                                                            | Below                                                                                          | Below. `makeKey()` moves key-window status away from the text field's window while showing. Effect on an open keyboard not verified. |
| Android mechanism                                     | In-tree `View` (FWO is iOS-only). Optional `ToasterOverlayWrapper` (e.g. z-view).                                                                                   | `ComposeView` on `decorView`                                                                                                                                       | In-tree `Animated.View`                                                          | EasyWindow `TYPE_APPLICATION` window                                                           | `FrameLayout` on `decorView`                                                                                                         |
| Android: in-window `modal`/`formSheet`                | Above if rendered after `<Stack>`                                                                                                                                   | Above (`decorView` child added last)                                                                                                                               | Above if rendered after `<Stack>`                                                | Above                                                                                          | Above                                                                                                                                |
| Android: Dialogs (RN Modal, `@expo/ui` `BottomSheet`) | **No** (with z-view as wrapper: above Dialogs opened before the toast, on paper)                                                                                    | **No.** Maintainer, issue #12: "renders within the Activity window, it can appear behind native dialogs … does not force rendering above native dialogs by design" | **No**                                                                           | **Yes** for Dialogs opened before the toast                                                    | **No**                                                                                                                               |
| Android: keyboard                                     | Below                                                                                                                                                               | Below                                                                                                                                                              | Below                                                                            | Above (`FLAG_NOT_FOCUSABLE`)                                                                   | Below                                                                                                                                |
| Touch pass-through                                    | Yes (box-none positioner; Android touch-blocking bug #285 was closed). Toasts themselves are swipeable and pressable.                                               | Yes: `PassthroughWindow` hit-testing (iOS 18 fix, issue #2). Compose container on `decorView`.                                                                     | Yes outside the banner                                                           | Yes outside the toast window                                                                   | Yes (`PassThroughWindow.hitTest`, `PassThroughFrameLayout`)                                                                          |
| success / warning / error                             | `toast.success` / `.warning` / `.error` built in, each with its own icon                                                                                            | `type: 'success' \| 'warning' \| 'error'` built in (SF Symbols on iOS, Material icons on Android)                                                                  | `alertType` success/warn/error, or a custom `Component`                          | Presets `done` / `error` only. Warning needs a custom icon.                                    | `toast.success` / `.warning` / `.error` (SF Symbol names; Android maps by substring to bundled drawables)                            |
| Icon and colour customisation                         | Full: `icons`, per-variant styles, `backgroundComponent`, or `toast.custom(<JSX>)`. Restyle components work.                                                        | `backgroundColor`, `titleColor`, `messageColor`, `fontFamily`, `iconUri` (an image). No JSX. Icon tint is fixed per type unless you use an image.                  | Full (custom React component)                                                    | `backgroundColor`, `titleColor`, `messageColor`, `icon.uri` + `tintColor`. Native layout only. | `icon` / `iconSource`, `accentColor`, `strokeColor`. **Background fixed black, text white.**                                         |
| Imperative, module-level, survives navigation         | Yes (`toast()` works outside React; root `<Toaster />`)                                                                                                             | Yes (`showToast()`, no provider)                                                                                                                                   | Yes (`Notifier.showNotification`; root `NotifierWrapper`)                        | Yes (`toast()`, no provider)                                                                   | Yes (`toast.show()`; needs a root `<ToastProvider>`)                                                                                 |
| Last release / activity                               | 2026-08-15; active (multi-Toaster work merged 2026-08)                                                                                                              | 2026-06-09; 14 releases since 2025-07; repo pushed 2026-06-18; 94★                                                                                                 | Stable 2024-07-21; rc 2025-01-21; pushed 2025-03-17; 1,435★                      | 2024-11-10; 368★                                                                               | 2026-08-29; repo created 2026-04; 125★                                                                                               |
| Weekly downloads                                      | 351,130                                                                                                                                                             | 685                                                                                                                                                                | 15,464                                                                           | 402                                                                                            | 961                                                                                                                                  |
| New Architecture                                      | Yes (pure JS on Reanimated 4)                                                                                                                                       | **Required** (Nitro; RN ≥ 0.78)                                                                                                                                    | Yes (pure JS)                                                                    | TurboModule (codegen)                                                                          | **Required** (Fabric only, RN ≥ 0.76)                                                                                                |
| Expo setup                                            | No plugin. New native peer: `react-native-svg` (not installed), so a rebuild is needed.                                                                             | Autolinked. New native peer: `react-native-nitro-modules ≥ 0.35`. Rebuild needed.                                                                                  | None (JS). Uses installed RNS and RNGH.                                          | Autolinked. Known `useFrameworks: 'static'` build break (#15/#19). Rebuild needed.             | Autolinked. Needs `ios.infoPlist.UIViewControllerBasedStatusBarAppearance: true`. Rebuild needed.                                    |
| Jest                                                  | Hand-written `jest.mock` (from the earlier doc)                                                                                                                     | `jest.mock('react-native-nitro-toast', …)` required, because `index.ts` calls `NitroModules.createHybridObject` at import                                          | Mock `Notifier`                                                                  | `jest.mock('@baronha/ting')`                                                                   | Mock `toast` and `ToastProvider`                                                                                                     |

## D. Ranked top 3 against the priority list

Requirement 1 splits into iOS (1-iOS) and Android Dialog windows (1-Android). Android in-window `modal`/`formSheet` is met by all three.

**1. sonner-native**

- Meets: 1-iOS (sheets opened before and after, per the RNS source; see the caveat below), 2, 3 (built-in variants with full Restyle control), 4 and 5 (active, highest downloads, pure JS).
- **Misses:**
  - **1-Android:** under RN `<Modal>` and the `@expo/ui` `BottomSheet`. The `ToasterOverlayWrapper` + `react-native-z-view` route would add an unmaintained legacy-ViewManager dependency, and its New Architecture linking is unverified (z-view #10).
  - The keyboard on both platforms.
- Caveats:
  - Its own docs say the root Toaster cannot appear over native sheets on iOS, which contradicts the RNS `didAddSubview:` source. A device check is needed.
  - Adds `react-native-svg` (rebuild).

**2. react-native-nitro-toast**

- Meets: 1-iOS **without depending on order** (its own `UIWindow` at `.alert + 1`, so it also covers SwiftUI sheets and RN Modals), 2, 4 and 5 (active in 2026, New Architecture required, which matches this app).
- **Misses:**
  - **1-Android** for Dialogs, by design (issue #12).
  - The keyboard on both platforms.
  - **Partly misses 3:** the variants and icons are built in and colours are customisable, but the layout is native. There are no React or Restyle components, and the icon tint per type is fixed unless you supply an image `iconUri`.
- Caveats: new native dependency `react-native-nitro-modules`, low adoption (685 per week, 94★), and a single maintainer.

**3. react-native-notifier (`useRNScreensOverlay`)**

- Meets: 1-iOS (sheets opened before and after, per the RNS source, RNS `Test1096` and the maintainer's screenshot; not verified here), 2, 3 (custom component, full theming), 4 (with queue modes) and pure JS.
- **Misses:**
  - **1-Android** for Dialogs: there is no Android overlay and no wrapper prop.
  - The keyboard.
  - **Weak on 5:** no stable release since 2024-07-21 and the 3.0 rc has been stalled since 2025-01. It uses RN `Animated`, not Reanimated.

**Not ranked, but the only styled option above Android Dialogs:** `@baronha/ting`.

- Meets 1-Android (Dialogs opened before the toast, plus the keyboard), 1-iOS only for sheets opened before the toast, and 2 and 4.
- Partly meets 3 (no warning preset).
- **Fails 5:** unmaintained since 2024-11; the module-init `EasyWindow(currentActivity)` crashes after Activity recreation (#40); iOS crash report on RN 0.77 (#42); static-frameworks build break that affects this app's config (#15/#19).

**Bottom line (facts only):** no third-party package found meets requirement 1 on Android for RN `<Modal>` and the `@expo/ui` `BottomSheet` while also meeting 2, 3 and 5. On iOS, sonner-native, nitro-toast and notifier all reach above presented sheets. nitro-toast is the only one that does it with a separate window, independent of order.

## Not verified on a device

- Whether an always-mounted, or show-time-mounted, FWO stays above a native sheet presented afterwards on iOS 26 or 27. This decides between the RNS source and the sonner-native docs.
- FWO above the SwiftUI `@expo/ui` `BottomSheet`.
- The effect of pretty-toast's `makeKey()` on an open keyboard.
- `react-native-z-view` on RN 0.86 with the New Architecture, as sonner's `ToasterOverlayWrapper` on Android.
- `react-native-snackbar` iOS `delegate.window` under `enableSceneSupport: true`.
