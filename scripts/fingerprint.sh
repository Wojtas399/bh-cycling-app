#!/usr/bin/env bash
# Prints the native fingerprint of the working tree for each platform. With a
# git ref, compares it with that ref and lists the native sources that differ.
# The fingerprint is the runtime version: when it changes, OTA updates stop
# reaching installed builds and the release flow makes a new build instead.
#
#   scripts/fingerprint.sh              hashes only
#   scripts/fingerprint.sh origin/main  compare; exits 3 when any platform changed
#
# APP_ENV picks the config to hash (default production, what users have).
set -euo pipefail

base="${1:-}"
export APP_ENV="${APP_ENV:-production}"
platforms=(ios android)
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

generate() {
  (cd "$1" && npx --no-install @expo/fingerprint fingerprint:generate --platform "$2") >"$3"
}

if [[ -z "$base" ]]; then
  for p in "${platforms[@]}"; do
    generate . "$p" "$tmp/$p.json"
    printf '%-8s %s\n' "$p" "$(jq -r .hash "$tmp/$p.json")"
  done
  exit 0
fi

base_sha="$(git rev-parse --verify "$base^{commit}")"

# A real copy of node_modules: through a symlink the fingerprint hashes paths
# outside the project and never matches.
mkdir "$tmp/base"
git archive "$base_sha" | tar -x -C "$tmp/base" -f -
if git diff --quiet "$base_sha" -- package-lock.json; then
  if [[ "$(uname)" == Darwin ]]; then
    cp -cR node_modules "$tmp/base/node_modules"
  else
    cp -R node_modules "$tmp/base/node_modules"
  fi
else
  (cd "$tmp/base" && npm ci --ignore-scripts --no-audit --no-fund --loglevel=error >/dev/null)
fi

changed=0
for p in "${platforms[@]}"; do
  generate "$tmp/base" "$p" "$tmp/$p.base.json"
  generate . "$p" "$tmp/$p.head.json"
  before="$(jq -r .hash "$tmp/$p.base.json")"
  after="$(jq -r .hash "$tmp/$p.head.json")"
  if [[ "$before" == "$after" ]]; then
    printf '%-8s same     %s\n' "$p" "${after:0:12}"
    continue
  fi
  changed=1
  printf '%-8s changed  %s -> %s\n' "$p" "${before:0:12}" "${after:0:12}"
  npx --no-install @expo/fingerprint fingerprint:diff "$tmp/$p.base.json" "$tmp/$p.head.json" |
    jq -r '.[] | (.addedSource // .removedSource // .afterSource) as $s
      | select($s.hash != null)
      | "  \(.op)\t\($s.filePath // $s.id)\t\($s.reasons | join(","))"'
done

[[ "$changed" == 0 ]] || exit 3
