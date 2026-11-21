#!/usr/bin/env bash
# Builds the staging Release app, JS bundled in, from a clean prebuild and
# installs it on the e2e simulator or emulator.
#   bash scripts/e2e-build.sh ios|android
set -euo pipefail

platform="${1:-}"

# The e2e config runs against the staging bundle id, whatever .env.local says.
export APP_ENV=staging

# Stamped before the build, so an edit made while it runs still counts as unbuilt.
stamp="$(node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON e2e/buildStamp.ts print)"

case "$platform" in
  ios)
    # CocoaPods 1.16 on Ruby 4 crashes in its error reporter without it.
    export LANG=en_US.UTF-8
    npx expo prebuild --clean --platform ios
    npx expo run:ios --configuration Release --no-bundler \
      --device "${E2E_IOS_DEVICE:-BH e2e iPhone}"
    ;;
  android)
    npx expo prebuild --clean --platform android
    npx expo run:android --variant release --no-bundler \
      --device "${E2E_ANDROID_DEVICE:-BH_e2e_Pixel}"
    ;;
  *)
    echo "Usage: bash scripts/e2e-build.sh ios|android" >&2
    exit 1
    ;;
esac

node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON e2e/buildStamp.ts write "$platform" "$stamp"
