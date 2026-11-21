# Stacked PRs

A stack is a chain of PRs where each one's base is the branch of the PR below it. It lands bottom-up, one layer at a time.

## Land a stack

1. Merge the bottom PR with a **merge commit**. Never squash or rebase a layer, because both give `main` new commit IDs for work the layers above still hold under the old ones.
2. Retarget the next PR to `main` (GitHub does this when the base branch is deleted) and merge it the same way.
3. Bring a layer up to date with `git merge origin/main` and push. Don't press "Update branch" with rebase, for the same reason as step 1.

## When a layer conflicts after the one below merged

The usual cause is a layer below that was rebased or squashed on the way in. `main` then has the same content under new IDs, and the layer above still carries the old commits and their old conflict resolutions.

Fix it with one merge commit at the top of each remaining layer: `git merge origin/main`, resolve by keeping `main`'s version of what the lower layers already landed, then push. Check that the PR's file list is the same as before the merge. Never force-push a layer that someone has reviewed.
