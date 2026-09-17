---
name: commit-changes
description: >-
  Commit the current changes using a conventional-commit-style message in the
  format `type: суть изменений` (type inferred from the diff — fix, feat,
  chore, refactor, docs, test, style, perf; summary written in Russian). Use
  when the user asks to commit changes, create a commit, or says something
  like "закоммить изменения".
---

# Commit Changes

Creates a git commit whose message follows the format:

```
type: краткая суть изменений
```

where `type` is one of the conventional-commit types (`fix`, `feat`, `chore`,
`refactor`, `docs`, `test`, `style`, `perf`), chosen based on what the diff
actually does, and the summary after `: ` is a short, concise description in
Russian of the change (imperative/neutral phrasing, no trailing period).

## Steps

1. Run in parallel:
   - `git status` — see all untracked files (never `-uall`)
   - `git diff` and `git diff --staged` — see unstaged and staged changes
   - `git log --oneline -10` — match this repo's existing commit style

2. **Determine the type** from the actual change, not from what the user
   calls it:
   - `fix` — bug fix
   - `feat` — new feature / capability
   - `refactor` — code restructuring with no behavior change
   - `chore` — tooling, config, deps, non-source-affecting changes
   - `docs` — documentation only
   - `test` — tests only
   - `style` — formatting only, no logic change
   - `perf` — performance improvement

   If the diff mixes concerns, pick the type that matches the dominant/primary
   change. Don't split into multiple commits unless the user asks.

3. **Write the summary** in Russian: concise (aim for under ~60 characters
   after the `type: ` prefix), describing *what* changed, not a restatement of
   file names. No trailing period, lowercase after the colon unless a proper
   noun starts the sentence.

4. **Stage and commit**:
   - Stage specific files by name (never `git add -A`/`git add .`) — review
     `git status` after staging to confirm nothing unexpected (secrets,
     credentials, large binaries) got included.
   - Commit with the message via a heredoc:
     ```bash
     git commit -m "$(cat <<'EOF'
     type: суть изменений
     EOF
     )"
     ```
   - Follow this repo's/session's attribution rules if a system reminder
     specifies commit trailer lines — append them after a blank line, exactly
     as instructed, not invented.

5. Run `git status` after the commit to confirm success. If a pre-commit hook
   fails, fix the underlying issue and create a **new** commit — never
   `--amend` a commit that didn't happen, and never bypass hooks with
   `--no-verify` unless the user explicitly asks.

## Notes

- Only commit when the user actually asks for a commit in this turn — this
  skill doesn't imply committing proactively.
- Never use `git add -A` / `git add .`; stage the specific files that belong
  to this change.
- Never force-push, amend a previous commit, or skip hooks unless explicitly
  requested.
- If there's nothing to commit (no staged/unstaged changes), say so instead
  of creating an empty commit.
- If the diff is large/mixed and doesn't cleanly fit one `type`, ask the user
  whether they want it split, rather than guessing.
