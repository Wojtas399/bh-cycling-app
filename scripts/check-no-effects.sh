#!/usr/bin/env bash
# Fails when app code names useEffect or useLayoutEffect (ADR 0012). The ESLint
# rule gives editor feedback, but a disable comment switches it off. This grep
# has no off switch, and it also catches aliased imports and member access.
#
# It reads only tracked .ts and .tsx files, so node_modules and untracked files
# are never scanned. e2e/ and __tests__/ folders aren't app code, so they're
# skipped.
set -uo pipefail

cd "$(git rev-parse --show-toplevel)" || exit 2

git grep -n -w -E 'use(Layout)?Effect' -- '*.ts' '*.tsx' \
  ':(exclude)e2e/' ':(exclude,glob)**/__tests__/**'

case $? in
  0)
    echo >&2
    echo 'useEffect and useLayoutEffect are banned in app code, comments included.' >&2
    echo 'See docs/adr/0012-no-effects.md and CODING_STANDARDS.md for what to use instead.' >&2
    exit 1
    ;;
  1) exit 0 ;;
  *) exit 2 ;;
esac
