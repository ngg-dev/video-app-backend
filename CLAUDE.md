# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run start:dev      # run with watch mode
npm run build          # nest build
npm run lint           # eslint --fix
npm run lint:check     # eslint, no autofix
npm run typecheck      # tsc --noEmit
npm test               # jest unit tests (*.spec.ts, rootDir: src)
npm run test:watch
npm run test:cov
npm run test:e2e       # jest -c test/jest-e2e.json
npm run verify         # lint:check + typecheck + test — run this before considering a change done
```

Run a single test file: `npx jest path/to/file.spec.ts`. Run a single test case: `npx jest path/to/file.spec.ts -t "test name"`.

## Architecture

NestJS + TypeORM (Postgres) app, currently early-stage/scaffolded.

- `AppModule` (`src/app.module.ts`) wires global config (`@nestjs/config`, `.env`), TypeORM (`TypeOrmModule.forRoot`, connection read from `DATABASE_*` env vars, `autoLoadEntities: true`, `synchronize` on outside production), and feature modules.
- Feature modules live under `src/<domain>/<feature>/` following standard Nest structure: `*.module.ts`, `*.controller.ts`, `*.service.ts`, `entities/*.entity.ts`, `dto/*.dto.ts`.
- `src/ai-providers/deepseek/` wraps the DeepSeek provider via the Vercel `ai` SDK (`@ai-sdk/deepseek`, `generateText`). `DeepSeekService.generate` takes `{ model, prompt }` and defaults to `deepSeekModels.v4Pro`. The API key and model ids are pulled from `src/shared/constants/config.ts` and `src/shared/constants/deepseek.ts` rather than read from `process.env` directly in services — follow that pattern for new provider config.
- `src/generations/generation-item/` models a generation job: `GenerationItem` entity has a `status` enum (`GenereationItemStatus` in `src/shared/constants/generation-item.ts`: `PENDING`, `RUNNING`, `FAILED`, `COMPLETED`, `WAITING_START` — note the enum name's typo, keep it consistent rather than silently "fixing" it). Shared cross-cutting constants/enums go in `src/shared/constants/`, not inline in entities/services.
- Path imports use the `src/...` absolute form (baseUrl is repo root) alongside relative imports (`../../../shared/...`) in different files — no strict convention has been established yet, follow whichever style the file you're editing already uses.

## Notes

- `AppModule` currently imports `GenerationAttemptModule` from `./generation-attempt/generation-attempt.module`, but no such module exists under `src/`; the only generation-related module present is `GenerationItemModule` under `src/generations/generation-item/`, one directory level deeper than the import paths in `app.module.ts` expect. The app will not compile until this is resolved.
