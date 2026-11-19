# How to draw an interactive chart on Expo

Research for #244 (map #242). The question: what is the best way to draw an interactive trend chart with three lines, optional daily bars, up to about a year of daily points and touch-to-read-a-day: a chart library, or hand-drawing on the existing `react-native-svg`?

All sources were fetched on **2026-11-01**. Package sources are the published npm tarballs, read but not run. Nothing was built or run on a device, so **no performance figure below was measured on this app**. **C** = confirmed: stated by a linked primary source or read in the package or repo source. **I** = inferred: my reading. **Unknown** = no source found.

## Short answer

**Hand-draw the chart.** Use static `react-native-svg` paths, a `react-native-gesture-handler` Pan gesture, and a Reanimated cursor made of plain `Animated.View`s laid over the SVG.

- It adds no dependency. All three packages are already in `package.json`, so the feature can ship by OTA update. **C** for the packages, **I** for the OTA result (see [Native dependencies and OTA](#3-native-dependencies-and-ota))
- Every library that fits the requirements has a real cost here: a new native renderer, or a touch path that runs on the JS thread and has open New Architecture bugs, or a paid tier for combined lines and bars.
- The app needs one chart with one interaction. The drawing is small, and the scales and day lookup become pure `lib/` functions that `CODING_STANDARDS.md` wants tested.

**Runner-up: Victory Native.** It is the only library that meets every functional requirement on the UI thread. Its cost is adding Skia, and today's version does not line up with Expo's pin (see [Victory Native and Skia versions](#victory-native-and-skia-versions)).

**What would change the recommendation:**

- The spec adds pinch-zoom, panning through a range, or animated transitions between ranges. Move to Victory Native.
- A device prototype shows the hand-drawn chart janks on a low-end Android phone with a year of data. Move to Victory Native.
- More chart screens appear, so that axes and gestures would need maintaining as a shared chart kit. Move to Victory Native.
- Skia enters the app for another reason. Most of the native cost disappears, and Victory Native wins on effort.

## This repo

| Fact                                                                                                                                                                                                                                              | Where                                         |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| Expo SDK ~57.0.26, React Native 0.86.3, React 19.2.3                                                                                                                                                                                              | `package.json`                                |
| Reanimated 4.5.1, Worklets 0.10.1, Gesture Handler ~2.32.0, `react-native-svg` 15.15.4. All match Expo's pins.                                                                                                                                    | `node_modules/expo/bundledNativeModules.json` |
| Reanimated 4 requires the New Architecture, so the app is on it. 4.5.x supports RN 0.83 to 0.86 with Worklets 0.10.x or 0.11.x.                                                                                                                   | Reanimated compatibility                      |
| React Compiler is on (`experiments.reactCompiler: true`). It only compiles application code, not `node_modules`.                                                                                                                                  | `app.config.ts:111`, Expo compiler docs       |
| `runtimeVersion` uses the `fingerprint` policy, so a native change produces a new runtime.                                                                                                                                                        | `app.config.ts:41`                            |
| iOS uses `useFrameworks: 'static'`.                                                                                                                                                                                                               | `app.config.ts:75`                            |
| No Skia and no chart library is installed. Expo pins `@shopify/react-native-skia` to 2.6.2 for SDK 57, and the repo does not install it.                                                                                                          | `bundledNativeModules.json`                   |
| Android `minSdk` is 24.                                                                                                                                                                                                                           | `react-native/gradle/libs.versions.toml`      |
| Nothing in `app`, `components`, `lib` or `hooks` imports `react-native-svg`. It is present for `sonner-native` and `react-native-marked`, and it is a direct dependency.                                                                          | `npm explain react-native-svg`, grep          |
| Gesture Handler is only used for `GestureHandlerRootView`. Reanimated is only imported for side effects. No app code uses a gesture or a shared value yet.                                                                                        | `app/_layout.tsx:2-3`, grep                   |
| `components/WorkoutProfile.tsx` **does not use SVG**. It draws bars with nested `Box` views, so the repo has no SVG drawing precedent to copy. The ticket's "existing `react-native-svg`" means the installed package, not existing drawing code. | `components/WorkoutProfile.tsx:56-106`        |
| The theme names `Inter-*` fonts, but `app/_layout.tsx:27` loads only `Ionicons.font` and no Inter file is in the repo.                                                                                                                            | `constants/theme.ts`, `app/_layout.tsx`       |

**Binding rules.** No ADR covers charts. ADR 0004 and ADR 0008 show the project accepts packages with native code, and that adding one means new dev clients. ADR 0004 rules out hand-written _native_ code; the recommendation adds none. `CODING_STANDARDS.md` means data shaping goes in `lib/` with tests, and the chart component gets no UI test. ADR 0005 governs how the data is read, not how it is drawn.

## Sources

| Short name              | URL                                                                                                                                                                        |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Reanimated compat       | https://docs.swmansion.com/react-native-reanimated/docs/guides/compatibility/                                                                                              |
| Reanimated performance  | https://docs.swmansion.com/react-native-reanimated/docs/guides/performance/                                                                                                |
| Reanimated shared value | https://docs.swmansion.com/react-native-reanimated/docs/core/useSharedValue/                                                                                               |
| Pan gesture (2.x)       | https://docs.swmansion.com/react-native-gesture-handler/docs/2.x/gestures/pan-gesture/                                                                                     |
| Expo compiler docs      | https://docs.expo.dev/guides/react-compiler/                                                                                                                               |
| Expo runtime versions   | https://docs.expo.dev/eas-update/runtime-versions/                                                                                                                         |
| Expo Skia docs          | https://docs.expo.dev/versions/latest/sdk/skia/                                                                                                                            |
| Expo pins               | https://github.com/expo/expo/blob/sdk-57/packages/expo/bundledNativeModules.json, and `main` of the same file                                                              |
| Victory install         | https://nearform.com/open-source/victory-native/docs/getting-started                                                                                                       |
| Victory changelog       | https://github.com/FormidableLabs/victory-native-xl/blob/main/lib/CHANGELOG.md                                                                                             |
| Victory source          | `victory-native@43.0.1` tarball: `src/cartesian/CartesianChart.tsx`, `hooks/useChartPressState.ts`, `src/types.ts`                                                         |
| Skia README             | https://github.com/wcandillon/react-native-skia                                                                                                                            |
| Skia v3 install         | https://wcandillon.github.io/react-native-skia/docs/getting-started/installation/                                                                                          |
| Skia v2 install         | https://wcandillon.github.io/react-native-skia/v2/docs/getting-started/installation/                                                                                       |
| Skia migration          | https://wcandillon.github.io/react-native-skia/docs/getting-started/migration                                                                                              |
| Gifted source           | `react-native-gifted-charts@1.4.81` and `gifted-charts-core@0.1.83` tarballs: `dist/LineChart/index.js`, `dist/Components/common/LinearGradient.js`, `BarChart/types.d.ts` |
| Wagmi source            | `react-native-wagmi-charts@3.0.1` tarball and README                                                                                                                       |
| Chart Kit README        | `react-native-chart-kit@7.0.4` tarball, https://chartkit.io/docs/react-native/                                                                                             |
| ECharts wrapper         | https://github.com/wuba/react-native-echarts                                                                                                                               |
| npm                     | `npm view` for versions, peers and licences. `api.npmjs.org` for downloads, last month.                                                                                    |

GitHub issues are linked where cited.

## Comparison

| Criterion                    | Hand-drawn SVG + RNGH + Reanimated                 | Victory Native                                             | Gifted Charts                                                            | Wagmi Charts                                 |
| ---------------------------- | -------------------------------------------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------ | -------------------------------------------- |
| Three lines                  | Yes, three paths                                   | Yes, `yKeys` **C**                                         | Yes, `data`…`data5` or `dataSet` **C**                                   | Stacked overlay, one chart per line **C**    |
| Daily bars under the lines   | Yes                                                | Yes, `Bar` and `Line` in one chart **C**                   | `BarChart` takes `lineData` and `lineData2`, so **only two lines** **C** | No bars **C**                                |
| Touch reading                | Built by us, UI thread                             | `useChartPressState`, UI thread **C**                      | `pointerConfig`, **JS thread** React state **C**                         | Cursor per line, on Reanimated **I**         |
| Expo SDK 57 fit              | All pinned already **C**                           | Version mismatch with Expo's Skia pin **C**                | Peers are `*`; needs a gradient package **C**                            | Peers are `*`; Reanimated 4 documented **C** |
| New Architecture             | Required and in use; see limits below              | Required by 43 **C**                                       | Open iOS pointer bugs **C** (older RN versions)                          | Supported **I**, from closed #185            |
| React Compiler               | Our code follows the rules; `get()`/`set()` **C**  | No statement either way **Unknown**                        | No statement either way **Unknown**                                      | No statement either way **Unknown**          |
| Touch and scroll performance | Static SVG and a transform; good **I**, unmeasured | Best evidence; project claims 100+ FPS **C** for the claim | Open reports at about 300 points **C**                                   | Open report at 200–300 points **C**          |
| New native dependencies      | **None**                                           | **Skia** (+6 MB iOS, +4 MB Android) **C**                  | `expo-linear-gradient` **C**                                             | None                                         |
| OTA shippable                | Yes **I**                                          | No **C**                                                   | No **I**, because of the gradient package                                | Yes **I**                                    |
| Licence                      | MIT packages                                       | MIT                                                        | MIT                                                                      | MIT                                          |
| Maintenance                  | RN SVG, RNGH and Reanimated all active             | Active; 43.0.1 on 2026-10-20; 84 open issues               | Active; 1.4.81; 95 open issues; old issues stay open                     | Active; 3.0.1 on 2026-09-04                  |
| Downloads last month         | n/a                                                | 1.8 M                                                      | 947 k                                                                    | 125 k                                        |
| Dark theme                   | Full control, theme tokens                         | Props; text needs a Skia font **C**                        | Many props                                                               | Props                                        |
| Paid service                 | None                                               | None                                                       | None                                                                     | None                                         |

Also considered and dropped:

- **Chart Kit v7** (`react-native-chart-kit`): MIT core on `react-native-svg`, with no other native dependency. Its README lists combo charts under the licensed **Chart Kit Pro**, so lines with bars point to a paid tier. **C**
- **Apache ECharts** (`@wuba/react-native-echarts`): can render on SVG or Skia, but it adds `echarts` and `zrender` to the JS bundle. `echarts` is 60 MB unpacked on npm, though only part of that is bundled. **C** for the size, **I** for the rest. Much more than one chart needs. npm says MIT and GitHub says Apache-2.0, so check that before any use.
- **`@expo/ui` `Chart`**: already installed, but its types are marked `@platform ios`. No Jetpack Compose equivalent exists in the package. **C**
- **`react-native-graph`**: its peers include Reanimated and it is aimed at a single line. **I** from its description only; not examined further.
- **`react-native-svg-charts`** (last release 2019) and the old **`victory-native`** repo (archived): not maintained. **C**

## Details

### 1. Performance

- **Rule from Reanimated:** animate non-layout props such as `transform`, and keep animated components under about 100 on low-end Android. **C**
- **`react-native-svg` under animation has open problems:** [#2962](https://github.com/software-mansion/react-native-svg/issues/2962) (iOS Fabric, `useAnimatedProps` on `color` only shows the final value), [#2847](https://github.com/software-mansion/react-native-svg/issues/2847) (Android memory pressure from an animated gradient), [#2679](https://github.com/software-mansion/react-native-svg/issues/2679) (Android hitboxes with `animatedProps`). **C** The reports cover specific props, not cursors.
- **So do not animate SVG.** Draw the SVG once and never touch it again. The cursor line and three dots are about four `Animated.View`s above it, moved with `transform`. This sidesteps all three issues and stays well inside Reanimated's limit. **I**
- **Draw a year as four elements.** Each line is one `Path`, and all the bars are one `Path`. The element count does not grow with the number of days. **I**
- **The readout** updates React state through `scheduleOnRN`, only when the day index changes, in a small component separate from the chart. `runOnJS` is deprecated in the installed Worklets. **C** The chart itself does not re-render. **I**
- **A year is about one point per day** on a phone 350 pt wide, so bars have no room for gaps. Gaps only work at shorter ranges. **I** This applies to every option.

**Gifted Charts:** `onResponderMove` calls `setPointerX` and `setPointerIndex` as React state (`dist/LineChart/index.js:816-817, 925`). Nothing uses Reanimated in that path, and the React Compiler does not reach it. **C** Reports: [#789](https://github.com/Abhinandan-Kushwaha/react-native-gifted-charts/issues/789) (open; 300 points, thousands of views, near-unresponsive), [#298](https://github.com/Abhinandan-Kushwaha/react-native-gifted-charts/issues/298) (open). `hideDataPoints` may ease this. **Unknown**

**Wagmi Charts:** [#209](https://github.com/coinjar/react-native-wagmi-charts/issues/209) is open and reports degradation from 200–300 points, traced to `LineChart.Path`, even with no interactions. **C** That is inside our year-long range.

**Victory Native:** press tracking runs in gesture worklets and shared values (`CartesianChart.tsx`, `useChartPressState.ts`). **C** Open press bugs exist: [#637](https://github.com/FormidableLabs/victory-native-xl/issues/637) (close points), [#642](https://github.com/FormidableLabs/victory-native-xl/issues/642) (Android tap), [#656](https://github.com/FormidableLabs/victory-native-xl/issues/656) (stale touch on iOS), [#644](https://github.com/FormidableLabs/victory-native-xl/issues/644) (x range starting negative; ours would not). **C** Whether each applies at 43.0.1 is not established.

### 2. Gestures inside a scrolling screen

Pan offers `activeOffsetX`, `failOffsetY` and `activateAfterLongPress`, so a horizontal drag can read the chart while a vertical drag scrolls the screen. **C** A tap should also read a day, so add a Tap gesture or act on touch-down. **I** Exact offsets need tuning on a device. Victory exposes the same options through `chartPressConfig.pan` and defaults to a long-press delay. **C**

### 3. Native dependencies and OTA

"Any time native code is updated, we're required to make a new build before publishing an update." **C** (Expo runtime versions) With the `fingerprint` policy, adding Skia or `expo-linear-gradient` produces a new runtime, so the feature would wait for new builds. **I** Hand-drawing changes only JS, so it can go out as an OTA update to any build on the current runtime. **I** Note that a hand-drawn chart still depends on the Intervals.icu read and any `WELLNESS:READ` work from #236.

### Victory Native and Skia versions

This is the main reason Victory Native is not a clean choice today.

- Skia moved to `wcandillon/react-native-skia` and is now published as unscoped `react-native-skia`. `@shopify/react-native-skia` stops at 2.14. **C** (Skia migration)
- Skia v3 uses Graphite, requires Android API 26 and Vulkan, and is `latest` on npm. v2 is still maintained at 2.15.2. **C**
- Expo SDK 57 pins `@shopify/react-native-skia` 2.6.2. Expo's `main` pins 2.14.0. **C**
- `victory-native@43` peers: `react-native-skia >=2.15.1 <3.0.0`, Reanimated `>=4.1.7 <5`, Worklets `>=0.7`. The two Skia packages must not be installed together. **C**
- `victory-native@42` peers: `@shopify/react-native-skia >=2.6.0 <3.0.0`. **C**

| Route                                              | Good                        | Bad                                                                                                                                                                                                                                                                                              |
| -------------------------------------------------- | --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **A.** `victory-native@42.0.1` + Skia 2.6.2        | Stays on Expo's pin **C**   | One major behind. Skia 2.6.2 fails to build from source under `use_frameworks! :static` ([#3915](https://github.com/wcandillon/react-native-skia/issues/3915), maintainer points to a fix in 2.6.4), and this repo uses static frameworks. It only applies if the prebuilt is unavailable. **C** |
| **B.** `victory-native@43` + `react-native-skia@2` | Current Victory, Skia 2.15+ | Outside Expo's tested set. A bare install takes 3.x, which Victory does not support, so it must be `@2`. Open [#4339](https://github.com/wcandillon/react-native-skia/issues/4339) reports UI-runtime Hermes OOM since 2.13.1. **C**                                                             |

Choose **A** if the runner-up is ever needed on SDK 57, and re-check at the next Expo SDK.

Skia's text is drawn on the canvas, so Victory's axes need an `SkFont`. **C** That means a font file or `matchFont`, and the repo has no Inter file. A hand-drawn chart uses normal RN `Text`, with Polish labels from i18n and the theme's text variants. **I**

### 4. Gifted Charts' gradient package

`dist/Components/common/LinearGradient.js` throws `Gradient package was not found` if neither gradient package can be required, and `dist/index.js` loads `BarChart`, which imports it. **C** npm marks both packages optional, but this load path suggests a plain install would fail at import. **I** `expo-linear-gradient` is not installed, and it needs a native build. **I**

Open New Architecture pointer bugs: [#1029](https://github.com/Abhinandan-Kushwaha/react-native-gifted-charts/issues/1029) and [#1219](https://github.com/Abhinandan-Kushwaha/react-native-gifted-charts/issues/1219), both iOS and exactly our touch path. They were reported on RN 0.76 and 0.77, and not re-tested on 0.86. **C** for the reports

## Shape of the recommended build

- `lib/` pure functions, tested: x and y scales, SVG path strings for lines and bars, axis ticks, and touch x to day index. The y scale must include negative values because Form goes below zero. Missing days split a line into segments.
- A chart component: `Svg` with static `Path`s, axes and labels in RN `Text`, the theme's colours, wrapped in a `GestureDetector`.
- Shared values with `.get()` and `.set()` only, as the React Compiler requires. **C**
- Estimated at 200–300 lines plus tests. **I**

Build a throwaway device prototype first: a year of fake data, on a low-end Android phone and an iPhone, inside a scrolling screen. It tests the recommendation's one unmeasured claim and the React Compiler question below. If it fails, use route A above.

## Evidence limits

- No library or the hand-drawn approach was run. The performance ranking rests on architecture and issue reports.
- Victory's "100+ FPS" is the project's own claim.
- Issue reports are from various, often older, versions.
- **React Compiler:** no library states compatibility. I found no Gesture Handler 2.x page on using `Gesture.Pan()` with the compiler, and GitHub searches for it returned nothing. Only Reanimated's `get()`/`set()` rule is documented. The prototype must confirm the gesture works under the compiler. `"use no memo"` is the documented way out for one component. **C**
- The 200–300 line estimate is a judgement, and hand-drawing adds code that this repo must own.
- A search for chart libraries newer than these found only roundups, and no new contender. That search was not exhaustive.
