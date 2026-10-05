#!/usr/bin/env bash
#
# Prepare a git worktree so the app can be run from it.
#
# Symlinks the git-ignored local files (env files, Firebase config) from the
# main worktree and installs dependencies. Safe to re-run.
#
# Usage (from inside the worktree): npm run worktree:setup

set -euo pipefail

# Git-ignored paths that live only in the main worktree.
# `.env*.local` is expanded as a glob, `firebase` is the Firebase config dir.
LINKED_PATHS=(".env*.local" "firebase")

target="$(git rev-parse --show-toplevel)"
# The first entry of `git worktree list` is always the main worktree.
main="$(git worktree list --porcelain | sed -n '1s/^worktree //p')"

if [[ "$target" == "$main" ]]; then
  echo "This is the main worktree — nothing to link." >&2
  exit 1
fi

echo "Main worktree: $main"
echo "This worktree: $target"

shopt -s nullglob
linked=0
for pattern in "${LINKED_PATHS[@]}"; do
  matches=()
  for match in "$main"/$pattern; do
    # Literal (non-glob) patterns survive nullglob even when missing.
    [[ -e "$match" ]] && matches+=("$match")
  done
  if [[ ${#matches[@]} -eq 0 ]]; then
    echo "warn: nothing matching '$pattern' in main worktree, skipping" >&2
    continue
  fi
  for src in "${matches[@]}"; do
    name="$(basename "$src")"
    dest="$target/$name"
    if [[ -L "$dest" ]]; then
      ln -sfn "$src" "$dest"
    elif [[ -e "$dest" ]]; then
      echo "warn: $name already exists and is not a symlink, leaving it" >&2
      continue
    else
      ln -s "$src" "$dest"
    fi
    echo "linked $name"
    linked=$((linked + 1))
  done
done

if [[ $linked -eq 0 ]]; then
  echo "warn: no env/Firebase files linked — run 'npm run env:staging' in the main worktree first" >&2
fi

echo "Installing dependencies..."
cd "$target"
npm install
