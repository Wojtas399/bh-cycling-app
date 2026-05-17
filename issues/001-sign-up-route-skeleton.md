# Sign Up route skeleton + Sign In link

## Type

AFK

## What to build

Create the Sign Up screen shell and wire it into the navigation. This covers all the structural work: adding the `signUp` i18n namespace to `i18n/locales/pl.ts`, creating `app/(auth)/sign-up.tsx` with a `KeyboardAvoidingView` + `ScrollView` layout (matching the Sign In pattern), rendering the "Utwórz konto" title and "Zarejestruj się, aby zacząć" subtitle using existing design system components, and adding the "Masz już konto? Zaloguj się" footer as a `TouchableOpacity` that calls `router.back()`. On the Sign In screen, wrap the existing static `t('signIn.noAccount')` text in a `TouchableOpacity` that calls `router.push('/sign-up')`.

## Acceptance criteria

- [ ] `signUp` namespace exists in `i18n/locales/pl.ts` with keys for title, subtitle, all field labels, button labels, divider, footer link, validation errors, and Firebase error messages
- [ ] Tapping "Nie masz konta? Zarejestruj się" on the Sign In screen navigates to the Sign Up screen
- [ ] The Sign Up screen displays the title "Utwórz konto" and subtitle "Zarejestruj się, aby zacząć"
- [ ] The screen layout uses `KeyboardAvoidingView` + `ScrollView` so content is reachable with the keyboard open
- [ ] The screen respects safe area insets
- [ ] Tapping "Masz już konto? Zaloguj się" at the bottom of the Sign Up screen returns to the Sign In screen
- [ ] The OS back gesture also returns to Sign In (stack push used for navigation)
- [ ] No header is shown (inherits from the existing `(auth)` Stack layout)

## Blocked by

None — can start immediately

## Status

Done
