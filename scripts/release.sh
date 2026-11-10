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

# The version in app.config.ts on main. Dev builds carry it, and an rc branch
# must be cut at it, so staging gets the version Dev already had.
config_version() {
  sed -En "s/^  version: '($semver)',$/\\1/p" app.config.ts | grep . || die "Could not read the version from app.config.ts"
}

require_config_version() {
  local config
  config="$(config_version)"
  [[ "$1" == "$config" ]] || die "$GITHUB_REF_NAME does not match version $config in app.config.ts"
  version="$1"
}

# Hotfix and production refs decide the version. The edit stays in this
# checkout because EAS uploads the working tree, so nothing is committed back.
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

# Dev builds wait, so a failed EAS build turns the run red, and are never
# submitted. Android builds are not submitted until Google Play has a service
# account key, which waits on the Play developer account verification.
build() {
  local wait="" submit=""
  if [[ "$profile" != dev ]]; then
    wait=--no-wait
    [[ "$platform" == ios ]] && submit=--auto-submit
  fi
  eas build --platform "$platform" --profile "$profile" --non-interactive $wait $submit
}

# Dev builds leave a reserve of 3 builds a month per platform for staging and
# production. Called inside `if`, so a failed or unparseable usage check must
# stop the run here. Never fail open into a build.
dev_build_fits_quota() {
  local usage quota
  usage="$(eas account:usage wojtas --json --non-interactive)" || die "Could not read EAS usage"
  quota="$(jq -er --arg p "$platform" '
    .builds[$p].plan as $q
    | if ($q.used | type) == "number" and ($q.limit | type) == "number" then
        "\($q.used) \($q.limit) \(.account.billingPeriod.end | sub("\\.[0-9]+Z$"; "Z") | fromdate | strftime("%d %b") | ltrimstr("0"))"
      else error("no build quota for \($p)") end' <<<"$usage")" || die "Could not parse EAS usage"
  read -r used limit resets <<<"$quota"
  ((limit - used > 3))
}

skip_dev_build() {
  local used="$1" limit="$2" resets="$3" name
  [[ "$platform" == ios ]] && name=iOS || name=Android
  local line="Dev $name build skipped: $used/$limit used, resets $resets"
  echo "::warning::$line"
  echo "$line" >>"${GITHUB_STEP_SUMMARY:-/dev/null}"
}

update() {
  eas update --channel "$channel" --platform "$platform" --environment "$environment" \
    --message "$GITHUB_REF_NAME: $(git log -1 --pretty=%s)" --non-interactive "$@"
}

require_commit_on() {
  git merge-base --is-ancestor HEAD "origin/$1" || die "$GITHUB_REF_NAME is not on $1"
}

ref="$GITHUB_REF_TYPE:$GITHUB_REF_NAME"

if [[ "$ref" =~ ^branch:main$ ]]; then
  use_target dev
  version="$(config_version)"
  if has_matching_build; then
    update || die "Could not publish a dev update"
  elif dev_build_fits_quota; then
    build || die "Dev build failed"
  else
    skip_dev_build "$used" "$limit" "$resets"
  fi
elif [[ "$ref" =~ ^branch:rc/($semver)$ ]]; then
  use_target staging
  require_config_version "${BASH_REMATCH[1]}"
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
