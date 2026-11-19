# Glass and Sheen options in Expo SDK 57

Research for [#307](https://github.com/Wojtas399/bh-cycling-app/issues/307) (map [#306](https://github.com/Wojtas399/bh-cycling-app/issues/306)). Researched 2026-11-08 against Expo SDK 57 docs, Apple docs, Android and React Native references, and the installed `node_modules` (expo 57.0.26, expo-router 57.0.24, @expo/ui 57.0.22, react-native 0.86.3).

## Answer in short

- **Glass, iOS 26:** the native system path is already in our binary and is all OTA-able:
  - `expo-glass-effect` 57.0.4 is already autolinked as a dependency of `expo-router`.
  - Expo Router native tabs draw a Liquid Glass tab bar.
  - The `@expo/ui` sheet turns into a Liquid Glass sheet once we stop painting it with `containerColor`.
- **Glass, Android and iOS < 26:** no system glass. `GlassView` falls back to a plain `View`. The only real Android blur is `expo-blur` (new native dependency, so a store build), and it needs a `BlurTargetView` that wraps the content being blurred, which is awkward for a navigator-level tab bar. Recommend a translucent tinted fallback with the same hairline instead of blur.
- **Sheen:** React Native 0.86's `experimental_backgroundImage: 'linear-gradient(...)'` draws the gradient natively with no dependency, so it ships OTA. The hairline is plain `borderWidth`/`borderColor`. `react-native-svg` is the OTA fallback. `expo-linear-gradient` and Skia would both need a store build and add nothing we need.
- **Accessibility:** `AccessibilityInfo.isReduceTransparencyEnabled()` plus the `reduceTransparencyChanged` event (iOS only), `isDarkerSystemColorsEnabled()` for Increase Contrast (iOS, no change event) and `isHighTextContrastEnabled()` (Android, no change event). Android has no Reduce Transparency setting in this API.
- **Native build vs OTA:** only `expo-blur`, `expo-linear-gradient` and Skia would change the runtime fingerprint. Everything else in the recommendation is JS.

## 1. Glass surface

### 1.1 `expo-glass-effect` (`GlassView`, `GlassContainer`)

- It renders native iOS Liquid Glass through `UIVisualEffectView`. "`GlassView` is only available on iOS 26 and above. It will fallback to regular `View` on unsupported platforms." The SDK 57 page lists iOS, tvOS and Expo Go, and not Android. [Expo SDK 57 GlassEffect](https://docs.expo.dev/versions/v57.0.0/sdk/glass-effect/)
- Props: `glassEffectStyle` (`'regular' | 'clear' | 'none'`, or `{ style, animate, animationDuration }`), `tintColor`, `isInteractive`, `colorScheme`. `GlassContainer` merges nearby glass views (`spacing`). [same]
- Helpers: `isLiquidGlassAvailable()` checks the OS, compiler and Info.plist. It "may return `true` even when accessibility settings limit the effect". For that, the docs point to `AccessibilityInfo.isReduceTransparencyEnabled()`. `isGlassEffectAPIAvailable()` guards against "some iOS 26 beta versions [that] do not have the Liquid Glass API available, which can lead to crashes". [same]
- Pitfall: "Setting `opacity` to `0` on `GlassView` or any of its parent views causes the glass effect to not render at all". Animate with `glassEffectStyle.animate` instead. This matters for Reanimated fades on headers. [same]
- **Already in our binary.** `node_modules/expo-router/package.json` depends on `"expo-glass-effect": "^57.0.4"`. `expo-modules-autolinking search --platform ios` lists it (`GlassEffectModule`). The `@expo/fingerprint` output includes `expo-glass-effect/ios`.
  - Verified locally: adding `expo-glass-effect` to our `package.json` leaves the fingerprint hash unchanged (`83edf3e5…` before and after).
  - So `GlassView` can ship by OTA to any binary built from current `main`.
- Our iOS builds can render it: the EAS `sdk-57` image is "`macos-tahoe-26.5-xcode-26.6`" (Xcode 26.6). The iOS 26 SDK is what turns on Liquid Glass, and `app.config.ts` does not set `UIDesignRequiresCompatibility`. [EAS build infrastructure](https://docs.expo.dev/build-reference/infrastructure/)

### 1.2 `expo-blur` (`BlurView`)

- Works on Android, iOS, tvOS and web. On iOS it is a classic `UIVisualEffectView` blur with `tint` materials such as `systemChromeMaterialDark`, not Liquid Glass. [Expo SDK 57 BlurView](https://docs.expo.dev/versions/v57.0.0/sdk/blur-view/)
- Android setup (SDK 57): "wrap the content to be blurred in a `BlurTargetView` component and pass its ref to the `BlurView`". `blurMethod` defaults to `'none'`, which is a semi-transparent view with no blur. The alternatives are `'dimezisBlurView'` and `'dimezisBlurViewSdk31Plus'`. [same]
- Android cost: "The blur can be achieved efficiently only by using the RenderNode Android API". That API arrived in Android 12 (API 31). Below it, `expo-blur` uses RenderScript, which is "much less efficient". `dimezisBlurViewSdk31Plus` blurs only on API 31+ and falls back to `none` below. [same]; [Android RenderEffect, added in API 31](https://developer.android.com/reference/android/graphics/RenderEffect)
- Other limits:
  - The blur doesn't update if `BlurView` renders before dynamic content such as a `FlatList`.
  - An explicit `borderRadius` isn't applied; use `overflow: 'hidden'`.
  - Android intensity differs from iOS (`blurReductionFactor`, default 4).

  [same]

- **Not installed.** Adding it is a new native module, which means a new fingerprint and a store build.
- **Fit for us on Android:** the tab bar is a sibling of the tab screens inside the navigator. To blur them, a `BlurTargetView` would have to wrap each screen's content and the `BlurView` would have to reach that target. That is doable for one screen's sticky header, but awkward for the shared tab bar. This is our inference from the setup above, not something the docs state.

### 1.3 Expo Router native tabs

- Import from `expo-router/unstable-native-tabs` in SDK 54–57 (`expo-router/native-tabs` from SDK 58). The `unstable-` path is the only maturity hint. [Native tabs guide](https://docs.expo.dev/router/advanced/native-tabs/); `node_modules/expo-router/unstable-native-tabs.d.ts`
- iOS 26: "the system draws the tab bar with Liquid Glass and derives its background from the content behind it". Also available: `minimizeBehavior="onScrollDown"`, `NativeTabs.BottomAccessory`, and a search tab role. [same]
- iOS ≤ 18: a classic `UITabBar`. `backgroundColor`, `blurEffect`, `shadowColor` and `disableTransparentOnScrollEdge` apply "on iOS 18 and earlier" only. [same]; `build/native-tabs/types.d.ts`
- Android: the platform Material tab bar, with no blur. You can theme it with `backgroundColor`, `indicatorColor`, `rippleColor`, `iconColor`, `tintColor` and label visibility. Max 5 tabs, and "By default on Android, the keyboard overlays the native tab bar". [same]
- Limits:
  - There is no custom tab bar beyond these props.
  - Icons move from `Ionicons` to `sf` (SF Symbols) and `md` (Material Symbols), or `src` images.
  - Scroll-to-top and minimize-on-scroll don't work with `FlatList`.
  - The tab bar height can't be measured.
  - Tabs can't be added dynamically.

  [same]

- **OTA?** It is JS on top of `react-native-screens` 4.26.2, which is already in the binary. Switching `app/(app)/(tabs)/_layout.tsx` from `Tabs` to `NativeTabs` is a JS change. Confirm that the fingerprint is unchanged and test on device before shipping it by OTA.

### 1.4 `@expo/ui` BottomSheet (ADR 0003)

- On iOS the universal sheet is a SwiftUI sheet. `node_modules/@expo/ui/src/universal/BottomSheet/index.ios.tsx` shows that when `containerColor` is set, it pushes `presentationBackground(containerColor)`. **Our `components/BottomSheet.tsx` passes `containerColor={theme.colors.bgTertiary}`, which paints over the system sheet material.**
- Apple: "Modal views like sheets and action sheets adopt Liquid Glass. Sheets feature an increased corner radius, and half sheets are inset from the edge of the display to allow content to peek through from beneath them. When a half sheet expands to full height, it transitions to a more opaque appearance". Apple also says to audit and remove custom sheet backgrounds. [Adopting Liquid Glass](https://developer.apple.com/documentation/technologyoverviews/adopting-liquid-glass)
- So **on iOS 26, dropping `containerColor` on iOS only (and keeping `preferredColorScheme('dark')`) gives Glass sheets for free.** A `fullHeight` Note sheet goes more opaque by design. This is a JS change, so it can ship by OTA. Below iOS 26, the system sheet background shows instead.
- On Android the sheet is a Material 3 `ModalBottomSheet`, painted with `containerColor`, and has no blur. Keep `bgTertiary` there, or give it a Sheen-like tint.
- `@expo/ui/swift-ui/modifiers` also exposes `glassEffect({ glass: { variant, interactive, tint }, shape, cornerRadius })` and `buttonStyle('glass' | 'glassProminent')` (iOS 26+) for SwiftUI-hosted content. This may be useful later for controls. [SDK 57 SwiftUI modifiers](https://docs.expo.dev/versions/v57.0.0/sdk/ui/swift-ui/modifiers.md)
- ADR 0003's consequences say "We set only the background, drag indicator, Android scrim and a forced dark scheme on iOS". Dropping the iOS background needs a short amendment.

### 1.5 Headers (`components/ScreenHeader.tsx`)

- `ScreenHeader` is our own JS row (`headerShown: false` on the stack). It sits in flow, so content doesn't scroll under it today. A Glass header has two routes:
  - **(a) Keep the JS header.** Make it absolutely positioned over the scroll view and render a `GlassView` behind it on iOS 26, with a translucent fallback elsewhere. Every screen that uses it then needs a top content inset equal to the header height.
  - **(b) Use the native stack header.** Set `headerTransparent`, and on iOS 26 use `scrollEdgeEffects` (`automatic | hard | soft | hidden`), which "will blur the scrolling content below certain UI elements". `headerBlurEffect` is iOS-only. The types warn: "Using both `headerBlurEffect` and `scrollEdgeEffects` (>= iOS 26) simultaneously may cause overlapping effects." `node_modules/expo-router/build/react-navigation/native-stack/types.d.ts`
- (b) is the most native on iOS 26, but it reworks every pushed screen's header (back button, title). (a) is closer to today's code. Both are JS-only.

### 1.6 Tab bar today (`app/(app)/(tabs)/_layout.tsx`)

- It uses JS `Tabs` with `tabBarStyle` (`bgTertiary`, 1px `borderDefault` top border). The bottom-tabs fork in `expo-router` offers `tabBarBackground`: "You could render an image, a gradient, blur view etc. When using `BlurView`, make sure to set `position: 'absolute'` in `tabBarStyle` as well. You'd also need to use `useBottomTabBarHeight()` to add a bottom padding to your content." `node_modules/expo-router/build/react-navigation/bottom-tabs/types.d.ts`
- So there are two choices:
  - **NativeTabs.** System Liquid Glass on iOS 26 and a Material bar on Android, but less control.
  - **JS Tabs with `tabBarBackground={GlassView}`.** iOS 26 glass in our own bar shape, a translucent fallback elsewhere, plus bottom padding on every tab screen.
- `IntervalsReconnectBanner` sits outside `<Tabs>`, so either choice keeps it.

## 2. Sheen surface

| Option                                                             | Installed?                            | Ship            | Restyle fit                                                                                               | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| ------------------------------------------------------------------ | ------------------------------------- | --------------- | --------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| RN `experimental_backgroundImage: 'linear-gradient(135deg, …)'`    | Core RN 0.86                          | OTA             | A `style` prop on `Box`, so it goes in a `<Surface>` component (Restyle variants only take Restyle props) | Native draw, no extra views. Marked experimental. Later RN docs drop the `experimental_` prefix (`backgroundImage`), so an RN upgrade will need a rename. [RN 0.86 View style props](https://reactnative.dev/docs/0.86/view-style-props); `node_modules/react-native/Libraries/StyleSheet/StyleSheetTypes.d.ts:520`. Expo's own linear-gradient page points to it as "an alternative for gradient backgrounds without adding an extra dependency". [Expo SDK 57 LinearGradient](https://docs.expo.dev/versions/v57.0.0/sdk/linear-gradient/) |
| `react-native-svg` `<LinearGradient>` + `<Rect rx>` behind content | Yes (15.15.4, used by `FitnessChart`) | OTA             | Wrapped in a `<Surface>`                                                                                  | Adds an SVG view per card, which is heavier in long lists (Calendar) than a style gradient. The SVG `rx` must match the card radius.                                                                                                                                                                                                                                                                                                                                                                                                         |
| `expo-linear-gradient`                                             | No                                    | **Store build** | A component, wrapped in a `<Surface>`                                                                     | `colors`, `locations`, `start`/`end`, Android `dither`. Stable, but the same result as the RN style, plus a native dependency. [Expo SDK 57 LinearGradient](https://docs.expo.dev/versions/v57.0.0/sdk/linear-gradient/)                                                                                                                                                                                                                                                                                                                     |
| `@shopify/react-native-skia`                                       | No                                    | **Store build** | A canvas, wrapped                                                                                         | Recommended 2.6.2 for SDK 57. Overkill for a two-stop gradient. [Expo SDK 57 Skia](https://docs.expo.dev/versions/v57.0.0/sdk/skia/)                                                                                                                                                                                                                                                                                                                                                                                                         |

- The hairline needs no library: `borderWidth: 1` (or `StyleSheet.hairlineWidth`) and `borderColor: 'rgba(255,255,255,0.08–0.14)'` as new Restyle colour tokens. Add a large `borderRadius` token next to them.
- Gradient stops go in `constants/theme.ts` as tokens, for example `sheenFrom` and `sheenTo`. A `<Surface variant="sheen">` reads them.

## 3. Performance (lower-end Android, long lists)

- Blur is costly, and on Android it is only efficient on API 31+ (RenderNode). Below that it falls back to RenderScript, "much less efficient". [BlurView](https://docs.expo.dev/versions/v57.0.0/sdk/blur-view/) Keep blur to the 1–3 chrome instances (tab bar, header, sheet), never on list items. Apple's HIG also says "Don't use Liquid Glass in the content layer" and "Use Liquid Glass effects sparingly". [HIG Materials](https://developer.apple.com/design/human-interface-guidelines/materials)
- A gradient in a style prop is a native draw on the existing view, the cheapest option per card. SVG adds a native view per card. `expo-linear-gradient` adds one native view per card. On Android, `dither: false` "may improve rendering performance". We did **not** benchmark anything. The Home prototype should be profiled on a low-end Android device with the Calendar month grid on screen.

## 4. Accessibility hooks

Source: [React Native AccessibilityInfo](https://reactnative.dev/docs/accessibilityinfo).

| Setting             | iOS                                                                       | Android                                                             |
| ------------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| Reduce Transparency | `isReduceTransparencyEnabled()` and the `reduceTransparencyChanged` event | No API. The OS setting doesn't exist.                               |
| Increase Contrast   | `isDarkerSystemColorsEnabled()` (no change event)                         | `isHighTextContrastEnabled()` (high text contrast, no change event) |
| Reduce Motion       | `isReduceMotionEnabled()` and `reduceMotionChanged`                       | same (also "Animation off" in developer options)                    |

- System Liquid Glass (native tabs, sheets) adapts on its own: "If you use standard components from system frameworks, this experience adapts automatically. Ensure you test your app's custom elements". [Adopting Liquid Glass](https://developer.apple.com/documentation/technologyoverviews/adopting-liquid-glass)
- For our own `GlassView` or Sheen surfaces:
  - On Reduce Transparency, swap to the opaque fallback.
  - On Increase Contrast or high text contrast, raise the hairline opacity and flatten the gradient.
  - Re-check the contrast settings on app foreground, since they have no change events.

## 5. Native build vs OTA

The runtime version uses `policy: 'fingerprint'` (`app.config.ts`).

| Change                                                               | Needs store build?                                                                                                           |
| -------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `GlassView` / `GlassContainer` (`expo-glass-effect`)                 | **No.** It is already autolinked via `expo-router`, and adding it to `package.json` left the fingerprint unchanged (tested). |
| `NativeTabs` (`expo-router/unstable-native-tabs`)                    | No: JS on `react-native-screens`, which is already linked. Confirm the fingerprint and test on device.                       |
| Dropping iOS `containerColor` on the `@expo/ui` sheet                | No: JS.                                                                                                                      |
| Native stack `headerTransparent` / `scrollEdgeEffects`               | No: JS.                                                                                                                      |
| RN `experimental_backgroundImage` gradient, hairline borders, tokens | No.                                                                                                                          |
| `react-native-svg` gradient                                          | No (already installed).                                                                                                      |
| `expo-blur`                                                          | **Yes.**                                                                                                                     |
| `expo-linear-gradient`                                               | **Yes.**                                                                                                                     |
| `@shopify/react-native-skia`                                         | **Yes.**                                                                                                                     |

## Recommendation

1. **Sheen:** build a `<Surface variant="sheen">` on `Box` with:
   - `experimental_backgroundImage` linear-gradient tokens (lighter grey top-left to black);
   - a 1px `rgba(255,255,255,~0.1)` hairline;
   - a large radius token.

   It needs no new dependency and ships by OTA. Keep `react-native-svg` as the fallback if the experimental prop misbehaves on a device.

2. **Glass on iOS 26 (system first):**
   - Drop `containerColor` on iOS in `BottomSheet` (with an ADR 0003 amendment).
   - Prototype the tab bar both as `NativeTabs` and as JS `Tabs` with a `GlassView` `tabBarBackground`.
   - Make `ScreenHeader` an overlay with a `GlassView` behind it.
3. **Glass on Android and iOS < 26:**
   - Don't add `expo-blur` now. Use a translucent tinted fallback (for example `rgba(28,28,30,0.85)` plus the hairline) behind the same `<GlassSurface>` API.
   - Revisit `expo-blur` with `dimezisBlurViewSdk31Plus` only if the Android prototype feels flat and a store release is going out anyway.
4. **Accessibility:** a `useSurfaceA11y()` hook reads Reduce Transparency (with its event) and the contrast flags. `<GlassSurface>` goes opaque, and `<Surface>` strengthens its hairline.
5. **Everything above ships by OTA.** The prototype on Home can switch between variants with no store build.

### Open questions for the owner

- Native tabs (system look, Material on Android, SF Symbols) or JS tabs with our own glass background?
- Header route: an overlay JS header, or the native stack header with scroll-edge effects?
- Is a no-blur translucent fallback on Android acceptable as "parity"?
