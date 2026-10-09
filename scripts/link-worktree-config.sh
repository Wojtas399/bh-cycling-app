#!/usr/bin/env bash
# Symlinks gitignored local config (.env.local, firebase/) from the main
# repo checkout into the current git worktree.
set -euo pipefail

worktree_root="$(git rev-parse --show-toplevel)"
main_root="$(cd "$(git rev-parse --git-common-dir)/.." && pwd)"

if [[ "$worktree_root" == "$main_root" ]]; then
  echo "Run this from inside a worktree, not the main repo ($main_root)." >&2
  exit 1
fi

for path in .env.local firebase; do
  source="$main_root/$path"
  target="$worktree_root/$path"

  if [[ ! -e "$source" ]]; then
    echo "skip  $path (missing in main repo)"
  elif [[ -L "$target" ]]; then
    echo "ok    $path (already linked)"
  elif [[ -e "$target" ]]; then
    echo "skip  $path (exists in worktree, not a symlink)"
  else
    ln -s "$source" "$target"
    echo "link  $path -> $source"
  fi
done
