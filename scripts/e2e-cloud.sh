#!/usr/bin/env bash
# Runs the e2e suite from this machine on an Expo Simulators device.
#   bash scripts/e2e-cloud.sh ios|android
# Builds the `e2e` profile on EAS first, unless E2E_IOS_BUILD_ID or
# E2E_ANDROID_BUILD_ID already names a build to reuse.
set -euo pipefail

platform="${1:-}"

case "$platform" in
  ios) build_id_var=E2E_IOS_BUILD_ID ;;
  android) build_id_var=E2E_ANDROID_BUILD_ID ;;
  *)
    echo "Usage: bash scripts/e2e-cloud.sh ios|android" >&2
    exit 1
    ;;
esac

# Fail on a leaked secret before spending a build on the run.
npm run e2e:check-cache

if [ -z "${!build_id_var:-}" ]; then
  build_id="$(npx eas-cli@latest build --platform "$platform" --profile e2e \
    --non-interactive --wait --json | node -e 'process.stdout.write(JSON.parse(require("fs").readFileSync(0, "utf8"))[0].id)')"
  echo "Built $platform: $build_id_var=$build_id"
  export "$build_id_var=$build_id"
fi

npm run "e2e:$platform"
