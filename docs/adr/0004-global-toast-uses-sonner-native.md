# Global Toast uses sonner-native behind our own wrapper

## Status

Accepted

## Context

Informational feedback ("password changed", "account deleted", Intervals.icu failures) was shown through `Alert.alert` or inline text, and we wanted a global Toast instead: a short message with a `success`, `warning` or `error` variant and no action buttons. It must persist across navigation, be callable from any hook or plain function, show above screens, native sheets and modals (including the `@expo/ui` BottomSheet) and let touches pass through. The project prefers Expo built-ins and doesn't want hand-written native code, but packages that ship native code are fine.

Expo has no cross-platform Toast. The only built-in is the `@expo/ui` Jetpack Compose `SnackbarHost`. It is Android-only, triggered through a ref, and has no variants. A JS overlay mounted at the root can meet every other requirement, but on Android it renders under Dialog windows, which is what the `@expo/ui` BottomSheet and RN `<Modal>` are.

## Decision

Toasts use **sonner-native**, called only through our own wrapper in `lib/toast`:

```ts
toast.success(message);
toast.warning(message);
toast.error(message);
```

Screens never import sonner; an ESLint `no-restricted-imports` rule enforces this everywhere except `lib/toast/**`. Each toast takes a single `message` string with no title and no per-call options. The wrapper maps our variants to sonner styling, plays the haptic and routes each toast to the right host.

- **Hosts.** On iOS, one root `<Toaster>` is enough. react-native-screens moves its `FullWindowOverlay` back to the top of the window, so it stays above sheets opened before and after the toast. On Android, the `BottomSheet` primitive (ADR 0003) mounts its own `<Toaster id>` and registers it while open. The wrapper sends each toast to the top-most registered host, or to the root host when none is open. That makes it a rule that **every Dialog-window overlay goes through the `BottomSheet` primitive**: no ad-hoc RN `<Modal>`.
- **Look.** A pill at the top centre, just below the status bar / Dynamic Island. It uses `bgTertiary` with a 1 px `borderStrong` border, `borderRadii.full`, and `textPrimary` text in Inter-Medium 14/20. Variants differ only by a 20 px Ionicons icon: `checkmark-circle` in `success`, `warning` in `warning` and `alert-circle` in `danger`.
- **Behaviour.** Every variant stays 3 s. Toasts show as a list, with up to 3 visible and a gap of `spacing.sm`. sonner's collapsed stack is turned off (`enableStacking: false`), because in 0.27 a tap on a stack expands it, pauses every timer and blocks touches underneath. Tapping a toast or swiping it up dismisses it, and these are its only interactions. Every variant plays `Haptics.notificationAsync` with the matching feedback type.

### What moves to Toast

- **Password changed:** `toast.success`, then an immediate `router.back()`.
- **Account deleted:** `toast.success` fires as soon as the deletion succeeds and survives the sign-out redirect. `lib/accountDeletedStore.ts` and the `consumeAccountDeleted()` check in sign-in are removed.
- **Intervals.icu connect / disconnect failures:** `toast.error` replaces the inline Settings footer, and `useIntervalsAuth` no longer returns `error`.
- **Intervals.icu connected:** a new `toast.success`.

These stay as they are:

- **Reset email sent:** keeps its native `Alert`. The message is too long for a 3 s pill, and the user acts on it.
- **Confirmation dialogs:** logout, disconnect Intervals, reset-password confirm and delete account need a blocking yes/no, so they stay native `Alert`s.
- **Inline form errors:** stay inline.
- **Data-fetch failures:** get no toast. The Calendar has its own error state, and background toasts would be noisy.
- **Stale Intervals auth:** keeps its persistent reconnect banner.

`warning` has no call site yet, but it stays in the API.

### Considered and rejected

- **Expo Compose `SnackbarHost` / `ToastAndroid`:** Android-only, with no variants.
- **Burnt / react-native-simple-toast:** native and above sheets, but plain system toasts on Android with no variants.
- **react-native-toast-message / a custom Reanimated host:** under Android Dialog sheets, and they don't solve that any better than sonner-native.
- **toastify-react-native:** its transparent RN `<Modal>` blocks every touch, it can't open over an open iOS sheet, and it looks unmaintained.
- **react-native-nitro-toast, react-native-notifier, @baronha/ting:** native layout we can't theme, stale maintenance or Android crashes.
- **A custom Expo module:** would mean hand-written native code.

## Consequences

- sonner-native adds `react-native-svg`, so adding it needs a dev-client rebuild.
- sonner-native's own docs say a root host sits under iOS native sheets. We rely on react-native-screens behaviour instead, so a sonner or react-native-screens upgrade must re-check that toasts still show above a `formSheet` and the `@expo/ui` sheet.
- Toasts don't show above system `Alert`s or permission prompts.
- Host routing is business logic and is unit-tested. The rendered toast is not.
- Toast is UI infrastructure, not domain language, so it stays out of `CONTEXT.md`.
