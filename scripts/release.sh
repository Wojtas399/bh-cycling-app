#!/usr/bin/env bash
# Routes the ref that triggered .eas/workflows/release.yml, passed in as
# REF_TYPE and REF_NAME, to a build or an OTA update for one platform. See
# "Releasing" in README.md.
set -euo pipefail

platform="$1"
semver='[0-9]+\.[0-9]+\.[0-9]+'

die() {
  echo "Error: $1" >&2
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
  [[ "$1" == "$config" ]] || die "$REF_NAME does not match version $config in app.config.ts"
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
# submitted.
build() {
  local wait="" submit=""
  if [[ "$profile" != dev ]]; then
    wait=--no-wait
    submit=--auto-submit
  fi
  eas build --platform "$platform" --profile "$profile" --non-interactive $wait $submit
}

# Dev builds stop at 80% of the monthly EAS build credit, which both platforms
# share, so the rest is left for staging and production. EAS reports the
# credit in cents. Called inside `if`, so a failed or unparseable usage check
# must stop the run here. Never fail open into a build.
dev_build_fits_quota() {
  local usage quota fits
  usage="$(eas account:usage wojtas --json --non-interactive)" || die "Could not read EAS usage"
  quota="$(jq -er '
    def usd: "$\(. / 100 | floor).\(. % 100 + 100 | tostring | .[1:])";
    .builds.plan as $q
    | if ($q.used | type) == "number" and ($q.limit | type) == "number" then
        "\($q.used * 100 < $q.limit * 80) \($q.used | usd) \($q.limit | usd) \(.account.billingPeriod.end | sub("\\.[0-9]+Z$"; "Z") | fromdate | strftime("%d %b") | ltrimstr("0"))"
      else error("no build credit") end' <<<"$usage")" || die "Could not parse EAS usage"
  read -r fits used limit resets <<<"$quota"
  [[ "$fits" == true ]]
}

skip_dev_build() {
  local used="$1" limit="$2" resets="$3" name
  [[ "$platform" == ios ]] && name=iOS || name=Android
  echo "Warning: Dev $name build skipped: $used/$limit build credit used, resets $resets"
}

update() {
  eas update --channel "$channel" --platform "$platform" --environment "$environment" \
    --message "$REF_NAME: $(git log -1 --pretty=%s)" --non-interactive "$@"
}

# EAS checks out a single commit, so the branch and its history are fetched
# before the ancestry check. --unshallow fails on a full clone.
require_commit_on() {
  local unshallow=""
  if [[ "$(git rev-parse --is-shallow-repository)" == true ]]; then
    unshallow=--unshallow
  fi
  git fetch $unshallow origin "+refs/heads/$1:refs/remotes/origin/$1" || die "Could not fetch $1"
  git merge-base --is-ancestor HEAD "origin/$1" || die "$REF_NAME is not on $1"
}

ref="$REF_TYPE:$REF_NAME"

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
