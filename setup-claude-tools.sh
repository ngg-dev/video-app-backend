#!/usr/bin/env bash
# One-time installer: creates the .claude/ agent toolkit for this repo.
# Run this once from inside backend/:  bash setup-claude-tools.sh
set -euo pipefail
cd "$(dirname "$0")"

mkdir -p ".claude"
cat > ".claude/settings.json" <<'CLAUDE_EOF'
{
  "permissions": {
    "allow": [
      "Read(./src/**)",
      "Read(./test/**)",
      "Read(./*.json)",
      "Read(./*.md)",
      "Edit(./src/**)",
      "Edit(./test/**)",
      "Bash(npm run lint)",
      "Bash(npm run lint:check)",
      "Bash(npm run lint:*)",
      "Bash(npm run format)",
      "Bash(npm run typecheck)",
      "Bash(npm test)",
      "Bash(npm run test:*)",
      "Bash(npm run build)",
      "Bash(npm run start:dev)",
      "Bash(npm run verify)",
      "Bash(npx prettier:*)",
      "Bash(npx eslint:*)",
      "Bash(git status)",
      "Bash(git diff:*)",
      "Bash(git log:*)",
      "Bash(git add:*)",
      "Bash(git commit:*)"
    ],
    "deny": [
      "Read(./.env)",
      "Read(./.env.*)",
      "Edit(./.env)",
      "Edit(./.env.*)",
      "Edit(./package-lock.json)",
      "Edit(./dist/**)",
      "Bash(rm -rf:*)",
      "Bash(git push:*)",
      "Bash(git reset --hard:*)",
      "Bash(git checkout .:*)",
      "Bash(npm publish:*)"
    ]
  },
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          {
            "type": "command",
            "command": "bash .claude/hooks/post-edit-format.sh"
          }
        ]
      }
    ],
    "PreToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          {
            "type": "command",
            "command": "bash .claude/hooks/pre-edit-guard.sh"
          }
        ]
      }
    ]
  }
}
CLAUDE_EOF

mkdir -p ".claude/hooks"
cat > ".claude/hooks/post-edit-format.sh" <<'CLAUDE_EOF'
#!/usr/bin/env bash
# PostToolUse hook: after Claude Code edits/writes a file, auto-format and lint-fix it
# if it's a TypeScript file. Never blocks the agent — failures are swallowed.
set -uo pipefail

INPUT="$(cat)"

FILE="$(node -e '
  try {
    const data = JSON.parse(process.argv[1]);
    const path = (data.tool_input && data.tool_input.file_path) || "";
    process.stdout.write(path);
  } catch (e) {
    process.stdout.write("");
  }
' "$INPUT" 2>/dev/null)"

[ -z "$FILE" ] && exit 0

case "$FILE" in
  *.ts)
    npx --no-install prettier --write "$FILE" >/dev/null 2>&1 || true
    npx --no-install eslint --fix "$FILE" >/dev/null 2>&1 || true
    ;;
esac

exit 0
CLAUDE_EOF

mkdir -p ".claude/hooks"
cat > ".claude/hooks/pre-edit-guard.sh" <<'CLAUDE_EOF'
#!/usr/bin/env bash
# PreToolUse hook: block edits/writes to files that should never be touched by an agent.
# Exit code 2 blocks the tool call and surfaces this script's stderr to Claude.
set -uo pipefail

INPUT="$(cat)"

FILE="$(node -e '
  try {
    const data = JSON.parse(process.argv[1]);
    const path = (data.tool_input && data.tool_input.file_path) || "";
    process.stdout.write(path);
  } catch (e) {
    process.stdout.write("");
  }
' "$INPUT" 2>/dev/null)"

[ -z "$FILE" ] && exit 0

case "$FILE" in
  *.env|*.env.*|*/package-lock.json|package-lock.json|*/dist/*)
    echo "Blocked by project policy: editing '$FILE' is not allowed. See CLAUDE.md." >&2
    exit 2
    ;;
esac

exit 0
CLAUDE_EOF

mkdir -p ".claude/skills/new-feature-module"
cat > ".claude/skills/new-feature-module/SKILL.md" <<'CLAUDE_EOF'
---
name: new-feature-module
description: Use when adding a new NestJS feature module (resource) to the backend — controller, service, DTOs, module wiring, and matching spec files that follow this project's conventions instead of the raw Nest CLI defaults. Triggers on "add a module", "new resource", "new endpoint", "new feature", "add a controller/service".
---

# Adding a new feature module

Follow these steps when the user asks for a new resource/module/feature in `backend/src`.

## 1. Scaffold

Prefer `nest g resource <name>` (or `nest g module/controller/service <name>` individually) so
the generated files match the project's existing shape (see `src/grok/` as the reference
layout: `<name>.module.ts`, `<name>.controller.ts`, `<name>.service.ts`, `dto/`, `entities/`,
plus `.spec.ts` for controller and service).

## 2. Replace placeholders — do not ship them

The generator produces stub bodies like `return 'This action adds a new <name>'`. These must be
replaced with real logic before the task is done. Grep the new files for `This action` before
finishing to make sure none were left behind.

## 3. DTOs

- Use `class-validator` decorators (`@IsString()`, `@IsInt()`, `@IsOptional()`, etc.) on every
  field of `create-<name>.dto.ts`.
- `update-<name>.dto.ts` should extend the create DTO with `PartialType` from
  `@nestjs/mapped-types`, matching the existing pattern in `src/grok/dto/update-grok.dto.ts`.
- Confirm `main.ts` has a global `ValidationPipe({ whitelist: true, transform: true })` — add it
  if missing, this is required for DTO validation to actually run.

## 4. Wiring

Register the new module in `src/app.module.ts`'s `imports` array. Do not register controllers or
providers directly in `AppModule` — they belong in the feature module.

## 5. External calls

If this module talks to an external AI/generation provider, do not call it directly from the
service — use the `add-ai-provider` skill instead to set up the provider abstraction first, then
inject it here.

## 6. Tests

Write real assertions in the generated `.spec.ts` files (unit tests for the service's actual
behavior, not just "should be defined"). Add or extend an e2e test in `test/` for the new
endpoints' happy path and at least one validation-failure case.

## 7. Verify

Run `npm run verify` before finishing.
CLAUDE_EOF

mkdir -p ".claude/skills/add-ai-provider"
cat > ".claude/skills/add-ai-provider/SKILL.md" <<'CLAUDE_EOF'
---
name: add-ai-provider
description: Use when integrating a new AI or video-generation provider (a new model API, e.g. for text, image or video generation) into the backend — defines the provider interface contract, config validation, retry/backoff, and the test double every provider needs. Triggers on "add a provider", "integrate <model/API>", "call the AI API", "connect to <provider>".
---

# Adding an AI / generation provider

## 1. Define (or reuse) the interface

All providers implement the same shape so they're swappable and mockable:

```ts
export interface VideoGenProvider {
  submit(input: SubmitInput): Promise<JobRef>;
  getStatus(job: JobRef): Promise<JobStatus>;
  fetchResult(job: JobRef): Promise<Asset>;
}
```

Put the interface and a DI token (`export const VIDEO_GEN_PROVIDER = Symbol('VIDEO_GEN_PROVIDER')`)
somewhere shared (e.g. `src/shared/`), not inside one provider's own folder.

## 2. Implement the provider

New folder `src/<provider-name>/` with a class implementing the interface. Register it in that
module's providers array under the shared DI token:

```ts
{ provide: VIDEO_GEN_PROVIDER, useClass: GrokProvider }
```

Never call the provider's HTTP client directly from a controller or from another feature's
service — always go through the interface.

## 3. Config

- Read the API key / base URL / model name / timeout via `@nestjs/config`'s `ConfigService`,
  never `process.env` directly.
- Add validation for the new env vars to the config module's schema so the app fails fast at
  startup with a clear error if a key is missing, not on the first request.
- Add the new variables to `.env.example` (create it if it doesn't exist) with placeholder
  values — never real keys.

## 4. Resilience

- Set an explicit request timeout.
- Retry on network errors and 429/5xx with exponential backoff + jitter; respect a
  `Retry-After` header if the provider sends one.
- Do not retry on 4xx errors that indicate a bad request (invalid prompt, auth failure) —
  surface those as a failed job state instead.
- Treat provider-side content refusals/moderation blocks as a normal terminal job status, not
  as a thrown exception that crashes the request.

## 5. Logging

Log request id, model, latency, and outcome for every call. Never log the API key or full
prompt content if the project's privacy stance forbids it — check `CLAUDE.md` / ask if unsure.

## 6. Test double

Add a fake implementation of the interface (e.g. `FakeVideoGenProvider`) under the module's
`test/` or alongside its spec file, returning deterministic results. Unit tests for anything
that depends on `VIDEO_GEN_PROVIDER` must use the fake, never the real provider — no live API
calls in `npm test` or `npm run test:e2e`.
CLAUDE_EOF

mkdir -p ".claude/agents"
cat > ".claude/agents/code-reviewer.md" <<'CLAUDE_EOF'
---
name: code-reviewer
description: Reviews the current uncommitted changes (or a given diff) against this project's conventions in CLAUDE.md — architecture rules, DTO/validation usage, provider abstraction, test coverage. Use after a feature or fix is implemented and before committing. Read-only, does not edit files.
tools: Read, Grep, Glob, Bash(git diff:*), Bash(git status), Bash(git log:*)
---

You are reviewing changes in this NestJS backend against the rules in `CLAUDE.md`. You do not
edit files — you report findings.

Steps:

1. Run `git status` and `git diff` (staged and unstaged) to see what changed.
2. Read `CLAUDE.md` for the project's architecture rules if you haven't already.
3. For each changed file, check for:
   - Leftover generator placeholder strings (`This action ...`).
   - DTOs without `class-validator` decorators.
   - Direct `fetch`/`axios`/HTTP client calls outside a provider class.
   - `process.env` read outside the config module.
   - Missing or superficial tests (e.g. only `should be defined`) for new service logic.
   - Secrets or API keys hardcoded in source.
   - Edits to `.env`, `dist/`, or `package-lock.json`.
4. Report findings ranked by severity: what's broken or risky first, then style/convention
   issues. For each finding, name the file, the concern, and a concrete fix — don't just say
   "improve validation," say what validation is missing on which field.
5. If nothing of substance is wrong, say so plainly instead of inventing nitpicks.
CLAUDE_EOF

mkdir -p ".claude/agents"
cat > ".claude/agents/test-runner.md" <<'CLAUDE_EOF'
---
name: test-runner
description: Runs the backend's unit and/or e2e tests, diagnoses failures against the source they cover, and applies minimal fixes. Use after code changes to confirm nothing broke, or to fix a known failing test. Keeps raw jest output out of the main conversation.
tools: Read, Edit, Grep, Glob, Bash(npm test:*), Bash(npm run test:*), Bash(npm run typecheck)
---

You run this backend's test suite and fix what's broken.

Steps:

1. Run `npm test` (unit) and, if relevant to the change, `npm run test:e2e`.
2. If everything passes, report that plainly and stop — do not go looking for extra work.
3. On failure, read the failing spec and the source file it covers before changing anything.
   Distinguish a genuinely broken implementation from a stale/wrong assertion in the test.
4. Apply the smallest correct fix. Do not weaken an assertion just to make it pass, and do not
   rewrite unrelated code.
5. Re-run the tests to confirm the fix. If a fix isn't obvious after one or two attempts, stop
   and report what you found instead of guessing further — describe the failure, your hypothesis,
   and what you tried.
6. Summarize: what failed, what you changed, and the final test result. Do not paste full raw
   jest output — a short summary of the relevant failure is enough.
CLAUDE_EOF

mkdir -p ".claude/commands"
cat > ".claude/commands/gen-module.md" <<'CLAUDE_EOF'
---
description: Scaffold a new NestJS feature module following project conventions
argument-hint: <module-name>
---

Add a new feature module named `$ARGUMENTS` to `backend/src`, following the `new-feature-module`
skill exactly (scaffold, replace placeholder bodies, DTO validation, wiring into `app.module.ts`,
real tests). Run `npm run verify` when done and report the result.
CLAUDE_EOF

mkdir -p ".claude/commands"
cat > ".claude/commands/review-pr.md" <<'CLAUDE_EOF'
---
description: Review the current uncommitted changes against project conventions
---

Use the `code-reviewer` subagent to review the current uncommitted changes (`git status` /
`git diff`) against the rules in `CLAUDE.md`. Relay its findings, ranked by severity, without
editing anything yourself.
CLAUDE_EOF

chmod +x .claude/hooks/*.sh
echo "Done. Created:"
echo "  .claude/settings.json"
echo "  .claude/hooks/post-edit-format.sh"
echo "  .claude/hooks/pre-edit-guard.sh"
echo "  .claude/skills/new-feature-module/SKILL.md"
echo "  .claude/skills/add-ai-provider/SKILL.md"
echo "  .claude/agents/code-reviewer.md"
echo "  .claude/agents/test-runner.md"
echo "  .claude/commands/gen-module.md"
echo "  .claude/commands/review-pr.md"
echo
echo "You can delete this script now: rm setup-claude-tools.sh"
