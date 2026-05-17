# Fix "has account" link to navigate explicitly to sign-in

## Type

AFK

## What to build

Replace `router.back()` on the "Masz już konto? Zaloguj się" link in `sign-up.tsx` with an explicit `router.replace('/sign-in')`. Using `router.back()` is fragile — if the user reaches the sign-up screen from any route other than sign-in, the back destination is unpredictable.

## Acceptance criteria

- [x] Tapping "Masz już konto? Zaloguj się" always navigates to the sign-in screen, regardless of navigation history
- [x] The back arrow button at the top of the screen retains its `router.back()` behaviour (it is intentionally history-based)

## Blocked by

None — can start immediately

## Status

Done
