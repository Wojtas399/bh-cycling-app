# Delegating tickets

How an orchestrator runs implementer subagents over a spec's tickets. Each implementer works one ticket in its own worktree and branch, and the orchestrator merges the branches into the spec's integration branch.

## Run

1. **Run at most 2 implementers at once.** Several children running together share one usage limit and die together when it runs out. Start the next ticket when one finishes.
2. **Brief each child from the template below.** Fill in the placeholders. Keep the brief in the `delegate_task` prompt or in this repo, never in your scratchpad, since a child or a later resume can't rely on a temp path.
3. **When a child dies** (usage limit, crash), check what it pushed: `git fetch && git log origin/<integration>..origin/<ticket-branch>`.
   - Nothing pushed: start a fresh child with the same brief.
   - Commits pushed: start a fresh child that resumes from `origin/<ticket-branch>`. The dead child's worktree still holds that branch, so `git checkout <ticket-branch>` fails with `already used by worktree`. Remove that worktree first (`git worktree remove --force <path>`, after checking `git -C <path> status` holds nothing unpushed), or have the new child check out under a new local name: `git checkout -B <ticket-branch>-resume origin/<ticket-branch>`, then push to the original name.
4. **Merge each finished ticket** into the integration branch with a merge commit, then run `npx tsc --noEmit`, `npm run lint` and `npx jest` on the result before you start a ticket that builds on it.
5. **Remove each ticket's worktree and local branch** once its branch is merged. Check `git worktree list` at the end of the spec. Nothing for this spec should be left.

## Implementer brief template

```markdown
Implement GitHub issue #<n> in Wojtas399/bh-cycling-app (`gh issue view <n> --comments`). Parent spec: #<spec>. Read CLAUDE.md, CODING_STANDARDS.md and <ADRs, research docs> first.

1. Your worktree must be based on `origin/<integration>`: `git fetch && git merge-base --is-ancestor origin/<integration> HEAD`, else `git reset --hard origin/<integration>`. Work on your own branch `<integration>-<n>`.
2. Build the ticket with the `mattpocock-skills:tdd` skill.
3. Commit and push your branch after each green step, so an interruption loses nothing.
4. Before reporting: `git fetch && git merge origin/<integration>`, resolve conflicts, and run `npx tsc --noEmit`, `npm run lint` and `npx jest` (whole suite), all green. Then push.
5. Run nothing billable: no e2e, simulators, emulators or EAS builds. Say in the report if the ticket needs e2e evidence.
6. Never push to `main`. Open no PRs, and don't close or comment on issues.

Report: branch, head SHA, what changed beyond the ticket, owner calls, and whether e2e evidence is needed.
```
