# Research: icon requirements on Expo SDK 57

Ticket: #209 (part of wayfinder map #208). Researched 2026-10-30.
This file records what the platforms and the installed Expo code do. Design calls belong to the map.

Installed versions read: `expo` 57.0.26, `@expo/prebuild-config` 57.0.16, `@expo/config-plugins` 57.0.9, `@expo/config-types` 57.0.2, `@expo/image-utils` 0.11.5, `expo-splash-screen` 57.0.9.
Test machine: Xcode 27.1 (27A9275), Node 24.15.0.

Legend:

- **[code]**: read in the installed package source. Paths are relative to `node_modules/`.
- **[tested]**: run for this ticket in a scratch project outside the repo, using the installed Expo packages through `expo prebuild --no-install`, then `actool`.
- **[docs]**: read in a first-party document.
- **[community]**: developer forum report. Real, but dated and not official.
- **[unverified]**: the source was silent, I could not test it, or this is my inference.

Confidence is High, Medium or Low, and applies to the answer as a whole.

## Answer

1. **Liquid Glass:** yes. `ios.icon` takes a path to a `.icon` directory, and a plain 1024 PNG still works. iOS segments a PNG into foreground and background and generates any appearance you don't provide. High.
2. **iOS dark and tinted:** not required. If you ship them as PNGs, the tinted PNG must be opaque, because Expo flattens it onto white. A transparent white mark becomes a blank white tile. High.
3. **Android adaptive:** 108 dp layers, keep the mark inside 66 dp, and yes, `backgroundColor` alone works. The `backgroundImage` key must be deleted, because it wins when both are set. High.
4. **Android monochrome:** a white mark on transparent, same geometry as the foreground. Launchers tint it by alpha only. High.
5. **Splash:** one transparent 1024 PNG, with `backgroundColor` and `dark.backgroundColor` both `#0A0A0A`. On Android 12+ the mark must fit a 192 dp circle, which is smaller than the repo's `imageWidth: 200`. High.
6. **Per-`APP_ENV` paths:** four template-string paths in `app.config.ts`. `eas.json` needs no change. High.
7. **Store artwork:** Google Play needs a 512 icon and a 1024x500 feature graphic. The App Store takes its icon from the build, so there is no separate upload. Both need screenshots. Neither is needed until a store listing exists. High for the specs, Low for the Play internal-testing minimum.
8. **Rasterising:** `@resvg/resvg-js` as a devDependency. `@expo/image-utils` cannot read SVG. High.

Findings that change the plan, none of which the Expo docs mention:

- **The tinted-PNG trap** in answer 2.
- **Colour alone will not separate staging from production** in monochrome modes. iOS tinted and clear, and Android themed icons, discard hue. See [Staging difference in monochrome modes](#staging-difference-in-monochrome-modes).
- **`monochromeImage` must vary by `APP_ENV` too**, for the same reason. The sketch in question 6 does this.
- **`backgroundImage` has to go**, and the current config sets both it and `backgroundColor`.

## 1. iOS 26+ Liquid Glass and `ios.icon`

**Confidence: High** for config and compile, **Medium** for the shipped result (see [Could not verify](#could-not-verify)).

**`.icon` is supported.**

- Expo added it in SDK 54: `"ios": { "icon": "./assets/app.icon" }`. Sources: [SDK 54 changelog](https://expo.dev/changelog/sdk-54), [app icons guide](https://docs.expo.dev/develop/user-interface/app-icons/). [docs]
- `ios.icon` must be a string. A `.icon` inside the `{ light, dark, tinted }` object, or at top-level `icon`, only produces a warning and isn't wired in. Source: `@expo/prebuild-config/build/plugins/icons/withIosIcons.js`. [code]
- Prebuild copies the directory to `ios/<Name>/`, adds it to Copy Bundle Resources, and sets `ASSETCATALOG_COMPILER_APPICON_NAME` to the file's basename. [tested]
- Apple requires that name to match. Source: [Creating your app icon using Icon Composer](https://developer.apple.com/documentation/xcode/creating-your-app-icon-using-icon-composer). [docs]
- Two files named by variant work, because the setting follows the basename. `AppIcon-production.icon` gave `ASSETCATALOG_COMPILER_APPICON_NAME = AppIcon-production`. [tested]
- The empty `AppIcon.appiconset` stays beside it. `actool` compiled the two together and used the `.icon`. [tested]

**A `.icon` covers every appearance from one file.**

- Icon Composer annotates default, dark and mono. The mono annotation covers clear and tinted. Separate dark or tinted PNGs aren't needed. Sources: [Apple](https://developer.apple.com/documentation/xcode/creating-your-app-icon-using-icon-composer), [Expo](https://docs.expo.dev/develop/user-interface/app-icons/). [docs]
- Prebuild's default deployment target is iOS 16.4, so releases before iOS 26 still need a fallback. [tested]
- Compiling with `--minimum-deployment-target 15.1`, which is lower than that, `actool` produced legacy PNGs (`AppIcon-production60x60@2x.png`) plus `CFBundleIconFiles`. Apple says Xcode generates "a similar-looking version of the Liquid Glass icon" for those releases. The output looked like the mark with a bevelled glass edge. [tested] [docs]
- To keep your own artwork on older iOS, Apple says to stay on an asset catalog. [docs]

**Authoring.**

- Icon Composer is bundled in Xcode at `Xcode.app/Contents/Applications/Icon Composer.app`, and is on this machine. [tested]
- Apple recommends SVG for layers. [docs] A `.icon` with `Assets/mark.svg` compiled, so the SVG master can be the layer directly. [tested]
- A hand-written `icon.json` compiled too. [tested] Its format isn't documented in anything I read, so treat that as a shortcut. Authoring in Icon Composer is the supported path. [unverified]

**Build tooling.**

- `.icon` needs Xcode 26 or later. EAS's `sdk-57` image is Xcode 26.6 (`macos-tahoe-26.5-xcode-26.6`). With no `image` in `eas.json` the build uses `auto`. Source: [EAS build infrastructure](https://docs.expo.dev/build-reference/infrastructure/). [docs]
- `auto` is picked from the project configuration, so confirm it in the "Spin up build environment" log. [docs]
- Be aware: I compiled with Xcode 27.1, not 26.6. [tested]

**A plain 1024 PNG on current iOS.**

Apple's [HIG](https://developer.apple.com/design/human-interface-guidelines/app-icons), updated 2026-10-28, says [docs]:

> If you provide a bitmap image instead, the system attempts to segment your icon, isolating the foreground elements from the background to create an icon with two layers.

> When the system segments your icon, it applies Liquid Glass effects to foreground layers that feature large, simple shapes. It doesn't automatically apply Liquid Glass effects to smaller, more complex elements in an icon like text and thin lines.

- It also says "the system automatically generates variants you don't provide". [docs]
- So a PNG is legal and gets system treatment, and a simple solid horse head is the kind of shape that should qualify. How well a horse-head silhouette segments is [unverified]. It needs a device or simulator check.
- Expo needs a square PNG, ideally 1024x1024, full bleed, no rounded corners, no transparency. Source: [app icons guide](https://docs.expo.dev/develop/user-interface/app-icons/). [docs]
- Expo flattens the light icon onto white in any case, so stray alpha turns white rather than failing. [code] [tested]

## 2. iOS dark and tinted variants

**Confidence: High** for config and pixels, **Medium** for how the black tinted background renders.

**Config shape** ([Expo](https://docs.expo.dev/develop/user-interface/app-icons/)) [docs]:

```ts
ios: {
  icon: {
    light: './assets/images/ios-light.png',
    dark: './assets/images/ios-dark.png',
    tinted: './assets/images/ios-tinted.png',
  },
},
```

Prebuild writes three 1024 entries to `AppIcon.appiconset/Contents.json`, with `luminosity` appearances `dark` and `tinted`. `actool` compiled them to `UIAppearanceDark` and `ISAppearanceTintable`. [tested]

**What Expo does to each PNG.** Source: `withIosIcons.js`, `generateUniversalIconAsync`. [code] Measured from prebuild output. [tested]

| Variant  | Expo treatment                          | Input                      | Output corner pixel      | Result                    |
| -------- | --------------------------------------- | -------------------------- | ------------------------ | ------------------------- |
| `light`  | Flattened onto `#ffffff`, alpha removed | Opaque `#0A0A0A` with mark | `10,10,10,255`, no alpha | Correct                   |
| `dark`   | Alpha kept                              | Transparent with mark      | `0,0,0,0`, has alpha     | Correct                   |
| `tinted` | Flattened onto `#ffffff`, alpha removed | Transparent with mark      | `255,255,255,255`        | **White on white, blank** |
| `tinted` | Flattened onto `#ffffff`, alpha removed | Opaque black with mark     | `0,0,0,255`              | Correct                   |

**Required artwork for a white horse head on `#0A0A0A`.**

- `light`: white mark on opaque `#0A0A0A`, 1024.
- `dark`: white mark on a transparent background. Apple: "Provide your dark app icon with a transparent background so the system-provided background can show through." Source: [Configuring your app icon](https://developer.apple.com/documentation/xcode/configuring-your-app-icon). [docs]
- `tinted`: white mark on opaque black, grayscale. Apple: "Provide your tinted app icon as a grayscale image." [docs] Apple's asset catalog page doesn't say a tinted icon must be transparent, and Expo removes transparency anyway.
- Give `light` explicitly. Without it the first of `dark` or `tinted` is used as the base, and flattened onto white. [code]

**Are they worth shipping?** Not required: "the system automatically generates variants you don't provide". [docs] Production is already near-black, so its dark variant would look close to its default one. That answers the map's open question as follows: dark and tinted PNGs are optional, and a `.icon` makes the question go away.

## 3. Android adaptive icon

**Confidence: High.**

**Geometry** ([adaptive icons guide](https://developer.android.com/develop/ui/views/launch/icon_design_adaptive)) [docs]:

- All layers are 108x108 dp. The outer 18 dp on each side is reserved for masking and motion effects.
- The inner 66x66 dp is the safe zone that no OEM mask clips.
- The logo should be at least 48x48 dp and must not exceed 66x66 dp.
- Layers have clean edges, with no masks or shadows around the outline.

The [`AdaptiveIconDrawable` reference](https://developer.android.com/reference/android/graphics/drawable/AdaptiveIconDrawable) says inner 72x72 dp instead. Design to 66, the stricter one.

**In a 1024 px source PNG** (my arithmetic): the safe zone is the centred 626 px, and the minimum logo is 455 px.

**What Expo generates.** Source: `withAndroidIcons.js`. [code] [tested]

- Foreground is resized to 108 dp per density, 432 px at xxxhdpi, with `resizeMode: 'cover'`, so use square sources.
- Expo asks for at least 512x512. Source: [app icons guide](https://docs.expo.dev/develop/user-interface/app-icons/). [docs] A 1024 source is fine.
- Current placeholders are 512 (foreground, background) and 432 (monochrome).

**A solid `backgroundColor` can replace `backgroundImage`.** With only `backgroundColor: '#0A0A0A'`, prebuild wrote `<background android:drawable="@color/iconBackground"/>` and `iconBackground` = `#0A0A0A`. [tested]

**`backgroundImage` overrides the colour.** `createAdaptiveIconXmlString` uses `@mipmap/ic_launcher_background` whenever it is set. [code] `app.config.ts` sets both today, so the key has to be deleted, not just the colour changed. The config docs state this too (`@expo/config-types/build/ExpoConfig.d.ts`). [code]

**Top-level `icon` still matters on Android.** It feeds the legacy `ic_launcher` and `ic_launcher_round` used below API 26, and this repo's React Native `minSdk` is 24. Keep it per `APP_ENV`. [code] [tested]

## 4. Android monochrome (themed) icon

**Confidence: High** for AOSP Launcher3, **Medium** for OEM launchers.

**Config:** `android.adaptiveIcon.monochromeImage`, written as the `<monochrome>` layer of `ic_launcher.xml`. [tested]

**Requirements:**

- Same 108 dp canvas, 66 dp safe zone and "clean edges" rules as the other layers. Source: [adaptive icons guide](https://developer.android.com/develop/ui/views/launch/icon_design_adaptive). [docs]
- Android's own sample reuses the foreground drawable for it, and says that's acceptable. [docs]
- Expo generates it with a transparent background, at 108 dp per density. [code]

**How it is masked.**

- It is tinted by alpha, not luminance. Launcher3's `ThemedIconDrawable` paints it with `new BlendModeColorFilter(colorFg, BlendMode.SRC_IN)`, over a background filled with `colorBg`. Source: [AOSP android14-release](https://android.googlesource.com/platform/frameworks/libs/systemui/+/refs/heads/android14-release/iconloaderlib/src/com/android/launcher3/icons/ThemedIconDrawable.java). `AdaptiveIconDrawable` only says "tinted according to the device or surface theme". [docs]
- So every opaque pixel becomes the theme colour, and colour information in the PNG is ignored. Use a solid mark on full transparency. A full-square opaque PNG would render as a solid block.
- It then goes through the same OEM shape mask as other layers. [docs]
- I read AOSP's launcher only. OEM launchers and Android 15+ versions of this class are [unverified].

**When it shows.** On Android 13+, only if the user enabled themed icons and the launcher supports them. From Android 16 QPR 2, Android themes apps that provide no monochrome layer too, so shipping one keeps the result under your control. [docs]

## 5. `expo-splash-screen`

**Confidence: High.**

**Image.** Use a `.png`, 1024x1024, transparent background. Only PNG is supported. Source: [splash and app icon guide](https://docs.expo.dev/develop/user-interface/splash-screen-and-app-icon/). [docs]

**Near-black in both modes is expressible, and I tested it:**

```ts
[
  'expo-splash-screen',
  {
    image: './assets/images/splash-icon.png',
    imageWidth: 200,
    resizeMode: 'contain',
    backgroundColor: '#0A0A0A',
    dark: { backgroundColor: '#0A0A0A' },
  },
],
```

- iOS `SplashScreenBackground.colorset` had both any and dark entries at `0.0392` per channel. [tested]
- Android wrote `#0A0A0A` to `values/colors.xml` and `values-night/colors.xml`. [tested]
- `dark.image` is not needed. No night drawable was generated, and no extra entry was added. The white mark is used in both modes. [tested]
- The current config has `backgroundColor: '#ffffff'` and `dark.backgroundColor: '#000000'`. Both need to change.

**Sizing trap on Android 12+.**

- `imageWidth` is in dp on Android. Expo centres the image, at `imageWidth` dp, on a transparent 288 dp canvas. At xxxhdpi that was an 800 px logo on a 1152 px canvas. Source: `expo-splash-screen/plugin/build/withAndroidSplashImages.js`. [code] [tested]
- Android requires an icon without a background to "fit within a circle 192 dp in diameter", and "Everything outside the circle turns invisible". Source: [Android splash screens](https://developer.android.com/develop/ui/views/launch/splash-screen). [docs]
- At `imageWidth: 200` the square exceeds that circle. Either lower `imageWidth`, or keep the mark inside the centred circle spanning 96% of the PNG width (192/200). My inference from the two facts above. [unverified on a device]
- iOS renders it at `imageWidth` points: 600 px at `@3x` for 200. [tested]

**Testing.** Don't test the splash in Expo Go or a development build. Use a preview or production build. Source: [splash and app icon guide](https://docs.expo.dev/develop/user-interface/splash-screen-and-app-icon/). [docs]

## 6. Icon paths per `APP_ENV`, and EAS builds

**Confidence: High** for config, **Medium** for the EAS run itself, which I did not perform.

`app.config.ts` is ordinary code that already branches on `IS_PRODUCTION`. Expo's [app variants tutorial](https://docs.expo.dev/tutorial/eas/multiple-app-variants/) shows the pattern for names and IDs, and doesn't mention icons. Prebuild followed `APP_ENV` for icon paths. [tested]

```ts
const ICON_VARIANT = IS_PRODUCTION ? 'production' : 'staging';

icon: `./assets/images/icon-${ICON_VARIANT}.png`, // Android legacy, plus iOS if no ios.icon
ios: {
  icon: `./assets/images/AppIcon-${ICON_VARIANT}.icon`, // or the { light, dark, tinted } object
},
android: {
  adaptiveIcon: {
    backgroundColor: '#0A0A0A',
    foregroundImage: `./assets/images/android-icon-foreground-${ICON_VARIANT}.png`,
    monochromeImage: `./assets/images/android-icon-monochrome-${ICON_VARIANT}.png`,
    // backgroundImage deleted
  },
},
```

**Nothing else needs changing for EAS.**

- `eas.json` already sets `APP_ENV` on all four profiles, three to `staging` and `production` to `production`, which matches the map's two variants.
- `ios/` and `android/` don't exist in the repo, so EAS runs prebuild and picks up the new paths. Source: the repo's `.gitignore`. Behaviour on EAS is [unverified] but standard for this setup.
- The assets must be committed, and nothing in `.gitignore` excludes `assets/` or a `.icon` directory.
- `expo-updates` isn't installed, so there is no OTA path. Icons are native, and Apple confirms an icon change needs a new version and review. Source: [Add an app icon](https://developer.apple.com/help/app-store-connect/manage-app-information/add-an-app-icon/). [docs]

**Local builds.**

- `APP_ENV` defaults to `staging`.
- Switching variant locally needs `npx expo prebuild --clean`. The iOS project directory itself changes (`BHCycling` against `BHCyclingStaging`, from `name`). [tested]
- The local image cache in `.expo/web/cache` is keyed by a hash of file contents, so replacing a PNG can't serve stale art. Source: `@expo/image-utils/build/Cache.js`. [code]

## 7. Store listing artwork

**Confidence: High** for specs, **Low** for the Play internal-testing minimum.

**Apple App Store**

- There is no separate icon upload. The icon comes from the build: add it through Icon Composer or an asset catalog, then "upload the build to App Store Connect". Source: [Add an app icon](https://developer.apple.com/help/app-store-connect/manage-app-information/add-an-app-icon/). [docs]
- Screenshots are required: 1 to 10 per size, JPEG or PNG, no alpha. One iPhone set at 1179x2556 or 1206x2622 is required. A 13-inch iPad set at 2064x2752 or 2048x2732 is also required, because `supportsTablet` is `true`. Source: [screenshot specifications](https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications). [docs]
- [community] Developers reported an "Invalid large app icon" alpha error when uploading Icon Composer icons on Xcode 26 betas. See [Apple forums thread 795411](https://developer.apple.com/forums/thread/795411). I found no statement on whether it is fixed, and my `.icon` used an opaque fill.

**Google Play**

| Asset           | Spec                                                                                                            | Required to publish |
| --------------- | --------------------------------------------------------------------------------------------------------------- | ------------------- |
| App icon        | 512x512, 32-bit PNG, sRGB, 1024 KB max                                                                          | Yes                 |
| Feature graphic | 1024x500, JPEG or 24-bit PNG, **no alpha**                                                                      | Yes                 |
| Screenshots     | At least 2, up to 8 per device type, JPEG or 24-bit PNG, 320 to 3840 px, long side at most twice the short side | Yes                 |

Sources: [Play Console preview assets](https://support.google.com/googleplay/android-developer/answer/9866151), [Play icon specification](https://developer.android.com/distribute/google-play/resources/icon-design-specifications). [docs]

For the Play icon, use a full square with no baked-in corners or shadow, because Play applies a 30% radius and a drop shadow. Google recommends an opaque background: "Transparent assets will display the background color of Google Play UI." [docs]

**When they're needed.** Dev, staging and preview are `distribution: internal` in `eas.json`, so none of this is needed for them. Only a store listing needs it. Play says listing assets are needed "to publish", and internal testers need access to the store listing, but I found no statement of the minimum assets for the internal track alone. [unverified]

**For the map:** the only non-screenshot store artwork is Play's 512 icon and 1024x500 feature graphic. Both can come from the SVG master, and neither blocks shipping the app icon.

## 8. Rasterising an SVG master from Node

**Confidence: High.** Use `@resvg/resvg-js` as a devDependency.

**`@expo/image-utils` can't do it.** `getMimeType` knows png, jpeg, webp and gif, and any other extension throws `Invalid mimeType`, so an `.svg` can't go straight into `app.config.ts` either. Source: `@expo/image-utils/build/Image.js`. [code]

| Option                    | Install                              | Tested result                                    | Notes                                                                                                                      |
| ------------------------- | ------------------------------------ | ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------- |
| `@resvg/resvg-js` 2.6.2   | 3.4 MB prebuilt, no system libraries | 11 PNGs in 2.7 s, 1024 down to 48, alpha correct | Recommended. Synchronous. Lockfile lists the Linux binary too                                                              |
| `@resvg/resvg-wasm` 2.6.2 | 2.4 MB, no native code               | 1024 PNG rendered, alpha correct                 | Same engine. Needs an async `initWasm` with `@resvg/resvg-wasm/index_bg.wasm`. Good fallback if a native binary ever fails |
| `sips` (macOS)            | None                                 | Read an SVG and wrote a 1024 PNG                 | macOS only, so not for a repo script. Fidelity not checked                                                                 |
| `sharp`                   | Not installed                        | Not tested                                       | Works but heavier, and adds a second image stack                                                                           |

Both resvg packages are MPL-2.0, and the npm record for 2.6.2 was last modified 2026-01-28. [tested]

Usage, as tested:

```js
const { Resvg } = require('@resvg/resvg-js');
const png = new Resvg(svg, { fitTo: { mode: 'width', value: 1024 } })
  .render()
  .asPng();
```

**resvg always writes an alpha channel, even for opaque art.** `sips` reported `hasAlpha: yes` on a fully opaque render. [tested] What this means per asset:

- iOS icons: nothing to do. Expo removes alpha from `light` and `tinted`. [tested]
- Play feature graphic: must have no alpha, so strip it in the script. `jimp-compact`'s `colorType(2)` produced a no-alpha PNG. [tested] It is only a transitive dependency here, so add it as a direct devDependency if the script uses it.

The map's plan to commit PNGs means EAS never runs this script. It only pays for the devDependency during `npm ci`.

## Staging difference in monochrome modes

This is my inference from answers 1, 2 and 4, and affects the design ticket directly.

- iOS tinted and clear, and Android themed icons, keep shape and alpha and drop hue. A staging variant that differs only by colour, such as an amber background, looks identical to production in those modes.
- If the variants must stay "visibly different at home-screen size" in those modes, the difference has to be a shape: for example a badge, band or cut-out in the mark.
- The staging monochrome PNG, and the mono annotation in a staging `.icon`, must carry that shape.

## Recommendation for the map

This is a judgement call, not a finding.

1. **iOS:** use one `.icon` per variant, authored in Icon Composer from the SVG, through `ios.icon`. It is Apple's preferred format, covers dark, clear and tinted without extra PNGs, and needs no dark and tinted decision. It costs a manual Icon Composer step per variant, and pre-iOS 26 devices get Xcode's generated fallback.
2. **Fallback:** one opaque 1024 PNG per variant, with no dark or tinted, if the `.icon` fails on a real EAS build or TestFlight upload. iOS generates the rest.
3. **Android:** `backgroundColor`, a per-variant foreground and a per-variant monochrome. Delete `backgroundImage`.
4. **Keep** a top-level per-variant 1024 PNG in every case, for Android's legacy icons.

Check before the spec relies on it: one EAS iOS build on the `sdk-57` image with a real Icon Composer file, installed on a device.

## Could not verify

- **Real rendering on iOS.** I didn't install a build on a device or simulator, so segmentation of a PNG, the Liquid Glass look, and tinted, dark and clear renders of a `.icon` are unseen. `ictool` is present, but its arguments aren't documented in anything I read and my guess failed.
- **`.icon` on EAS.** Not run on EAS, and not compiled on Xcode 26.6. I ran `actool` directly, not a full `xcodebuild`, so Xcode's own Resources-phase handling of the `.icon` is [unverified].
- **App Store acceptance of a `.icon`.** No upload was attempted. The forum alpha report above is unresolved.
- **Icon Composer output.** My `.icon` was hand-written, not exported from the app.
- **Black background on tinted PNGs.** Apple says "grayscale" and doesn't describe how black is treated. Check on a device if PNGs are used.
- **Splash masking.** The 192 dp clip on Android 12+ comes from docs and arithmetic, and wasn't seen on a device. Behaviour on API 24 to 30 wasn't researched.
- **`expo-doctor` with a `.icon` path.** The run was blocked by a local permission rule. The repo's CI doesn't run doctor, so it isn't a blocker.
- **Play internal-track minimum assets.** No source states it.
- **Android 15+ launcher tinting and OEM launchers.** I read AOSP `android14-release` only.
- **EAS dashboard variables.** I didn't check whether an `APP_ENV` is also defined there, and the [usage docs](https://docs.expo.dev/eas/environment-variables/usage/) give no general precedence against `eas.json`.
