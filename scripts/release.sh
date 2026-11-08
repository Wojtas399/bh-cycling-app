#!/usr/bin/env bash
# Routes the GitHub ref that triggered the release workflow to a build or an
# OTA update for one platform. See "Releasing" in README.md.
set -euo pipefail

platform="$1"
semver='[0-9]+\.[0-9]+\.[0-9]+'

die() {
  echo "::error::$1" >&2
  exit 1
}

use_target() {
  profile="$1"
  channel="$1"
  export APP_ENV="$1"
  if [[ "$1" == production ]]; then
    environment=production
  else
    environment=development
  fi
  # eas build ignores file variables outside EAS servers, and app.config.ts
  # needs the Firebase files to resolve. env:pull skips Secret variables.
  eas env:pull --environment "$environment" --non-interactive
}

# The ref decides the version. The edit stays in this checkout because EAS
# uploads the working tree, so nothing is committed back.
set_version() {
  version="$1"
  sed "s/^  version: '.*',$/  version: '$version',/" app.config.ts >app.config.ts.tmp
  mv app.config.ts.tmp app.config.ts
  grep -q "^  version: '$version',$" app.config.ts || die "Could not set version $version"
}

fingerprint() {
  eas fingerprint:generate --platform "$platform" --build-profile "$profile" --non-interactive --json | jq -r .hash
}

# Called inside `if`, where `set -e` is off, so EAS failures must stop the run
# here. Otherwise an outage would read as "no matching build".
has_matching_build() {
  local hash builds
  hash="$(fingerprint)" || die "Could not generate a fingerprint"
  builds="$(eas build:list --platform "$platform" --channel "$channel" --app-version "$version" \
    --fingerprint-hash "$hash" --limit 20 --non-interactive --json)" || die "Could not list EAS builds"
  jq -e 'any(.[]; .status != "ERRORED" and .status != "CANCELED")' <<<"$builds" >/dev/null
}

build() {
  eas build --platform "$platform" --profile "$profile" --non-interactive --no-wait --auto-submit
}

update() {
  eas update --channel "$channel" --platform "$platform" --environment "$environment" \
    --message "$GITHUB_REF_NAME: $(git log -1 --pretty=%s)" --non-interactive "$@"
}

require_commit_on() {
  git merge-base --is-ancestor HEAD "origin/$1" || die "$GITHUB_REF_NAME is not on $1"
}

ref="$GITHUB_REF_TYPE:$GITHUB_REF_NAME"

if [[ "$ref" =~ ^branch:rc/($semver)$ ]]; then
  use_target staging
  set_version "${BASH_REMATCH[1]}"
  if has_matching_build; then
    update
  else
    build
  fi
elif [[ "$ref" =~ ^branch:hotfix/v($semver)$ ]]; then
  use_target staging
  set_version "${BASH_REMATCH[1]}"
  has_matching_build || die "No staging build matches $version. A hotfix cannot change native code."
  update
elif [[ "$ref" =~ ^tag:v($semver)$ ]]; then
  use_target production
  set_version "${BASH_REMATCH[1]}"
  require_commit_on "rc/$version"
  build
elif [[ "$ref" =~ ^tag:v($semver)-hotfix-[0-9]+$ ]]; then
  use_target production
  set_version "${BASH_REMATCH[1]}"
  require_commit_on "hotfix/v$version"
  has_matching_build || die "No production build matches $version. A hotfix cannot change native code."
  update --rollout-percentage 0
else
  die "$ref is not a release ref"
fi
