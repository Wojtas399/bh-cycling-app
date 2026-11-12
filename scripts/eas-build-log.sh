#!/usr/bin/env bash
# Prints an EAS build's log: the build summary, the phases in order, then the
# lines of the phase that failed (or the last phase) unless the build finished.
#
#   scripts/eas-build-log.sh ios|android     latest build on that platform
#   scripts/eas-build-log.sh <build-id>
#   PHASE=<name> scripts/eas-build-log.sh …  that phase instead
set -euo pipefail

target="${1:?Usage: scripts/eas-build-log.sh ios|android|<build-id>}"
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

if [[ "$target" == ios || "$target" == android ]]; then
  eas build:list --platform "$target" --limit 1 --json --non-interactive 2>/dev/null | jq '.[0]' >"$tmp/build.json"
else
  eas build:view "$target" --json 2>/dev/null >"$tmp/build.json"
fi

jq -r '"\(.id)  \(.platform)  \(.status)  profile \(.buildProfile)  v\(.appVersion) (\(.appBuildVersion))",
  (.error.message // empty | "error: \(.)")' "$tmp/build.json"

# Log files are Brotli-compressed (macOS curl can't decode it, Node's fetch
# can). One holds the build's JSON-lines log, one record per line. iOS builds
# add the raw Xcode log, which is kept on disk and searched for errors.
id="$(jq -r .id "$tmp/build.json")"
i=0
jq -r '.logFiles[]' "$tmp/build.json" | while read -r url; do
  i=$((i + 1))
  node -e 'fetch(process.argv[1]).then(r => {
    if (!r.ok) throw new Error(`log download failed: ${r.status}`);
    return r.text();
  }).then(t => process.stdout.write(t))' "$url" >"$tmp/part$i"
  if [[ "$(head -c 1 "$tmp/part$i")" == "{" ]]; then
    cat "$tmp/part$i" >>"$tmp/log.jsonl"
  else
    raw="${TMPDIR:-/tmp}"
    raw="${raw%/}/eas-$id-$i.log"
    mv "$tmp/part$i" "$raw"
    echo
    echo "raw log ($(wc -l <"$raw" | tr -d ' ') lines): $raw"
    grep -n -E ': error: |^error: |❌' "$raw" | head -20 || true
  fi
done

[[ -s "$tmp/log.jsonl" ]] || { echo "No log yet."; exit 0; }

echo
echo "phases (lines, errors):"
jq -r '[.phase // "-", (.level // 30)] | @tsv' "$tmp/log.jsonl" | awk -F'\t' '
  !($1 in n) { order[++k] = $1 }
  { n[$1]++; if ($2 >= 50) e[$1]++ }
  END { for (i = 1; i <= k; i++) printf "  %-40s %6d %4d\n", order[i], n[order[i]], e[order[i]] }'

status="$(jq -r .status "$tmp/build.json")"
[[ -n "${PHASE:-}" || "$status" != FINISHED ]] || exit 0

phase="${PHASE:-$(jq -r 'select((.level // 0) >= 50 and .phase != "FAIL_BUILD") | .phase' "$tmp/log.jsonl" | tail -1)}"
phase="${phase:-$(jq -r '.phase // empty' "$tmp/log.jsonl" | tail -1)}"
echo
echo "== $phase"
jq -r --arg p "$phase" 'select(.phase == $p) | .msg' "$tmp/log.jsonl"
