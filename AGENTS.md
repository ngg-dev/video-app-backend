# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run start:dev      # run with watch mode
npm run build          # nest build
npm run lint           # eslint, no autofix
npm run lint:fix       # eslint --fix
npm run format         # prettier --write
npm run format:check   # prettier --check
npm run typecheck      # tsc --noEmit
npm run compile:test   # tsc --noEmit -p tsconfig.build.json — verifies the production build compiles, without emitting
npm test               # jest unit tests (*.spec.ts, rootDir: src)
npm run test:watch
npm run test:cov
npm run test:e2e       # jest -c test/jest-e2e.json
npm run verify         # lint + typecheck + test — run this before considering a change done
```

Run a single test file: `npx jest path/to/file.spec.ts`. Run a single test case: `npx jest path/to/file.spec.ts -t "test name"`.

## Architecture

NestJS + TypeORM (Postgres) app, currently early-stage/scaffolded.

- `AppModule` (`src/app.module.ts`) wires global config (`@nestjs/config`, `.env`), TypeORM (`TypeOrmModule.forRoot`, connection read from `DATABASE_*` env vars, `autoLoadEntities: true`, `synchronize` on outside production), and feature modules.
- Feature modules live under `src/<domain>/<feature>/` following standard Nest structure: `*.module.ts`, `*.controller.ts`, `*.service.ts`, `entities/*.entity.ts`, `dto/*.dto.ts`.
- `src/infrastructure/ai-providers/deepseek/` wraps the DeepSeek provider via the Vercel `ai` SDK (`@ai-sdk/deepseek`, `generateText`). `DeepSeekService.generate` takes `{ model, prompt }` and defaults to `deepSeekModels.v4Pro`. The API key and model ids are pulled from `src/shared/constants/config.ts` and `src/shared/constants/deepseek.ts` rather than read from `process.env` directly in services — follow that pattern for new provider config.
- `src/infrastructure/` holds adapters to external systems: `ai-providers/{deepseek,xai,runware}`, `storage`, `database/redis`. Each module keeps `*.module.ts` at its root with `controllers/`, `services/`, `dto/`, `types/`, `utils/`, `constants/` subfolders and specs only in `__tests__/` (only `*.spec.ts` there). Path aliases (tsconfig `paths` + jest `moduleNameMapper`): `@ai-providers/*`, `@storage/*`, `@database/*` (and `@infrastructure/*`, reserved for future groups). Consumers outside a module import it via the group-specific alias (e.g. `@storage/services/storage.service`); inside a module use relative imports. Infrastructure must not import domain modules. A new group needs a new alias in both tsconfig and jest config.
- `src/media/` splits ffmpeg operations from I/O orchestration: `MediaService` only builds/runs ffmpeg commands (via `FfmpegService`), while `VideoAssemblyService` (in the same `MediaModule`) owns downloading parts, calling `MediaService`, uploading the result to `StorageService` (from `@storage/services/storage.service`), and cleanup. `src/character-gallery/` similarly splits `CharacterGalleryService` (persistence, style resolution) from `CharacterImageService` (prompt → xAI → storage) and exports a shared `CharacterCollectionReaderService` (loads a collection with its characters) consumed by `CreateVideoModule`/`VideoPipeModule`. Shared cross-cutting constants/enums go in `src/shared/constants/`, module-local ones in `<module>/constants/`; reusable pure logic goes in `<module>/utils/` or `src/shared/utils/` — not inline in entities/services.
- Null/undefined checks go through the type guards in `src/shared/utils` (`isNull`/`isNotNull`/`isUndefined`/`isNotUndefined`/`isNullOrUndefined`/`isNotNullOrUndefined`) — don't write direct comparisons against `null`/`undefined` literals or `typeof x === 'undefined'`; exception: the guards' own implementation file.
- Path imports: `src/...` absolute form (baseUrl is repo root) and relative imports coexist — follow whichever style the file you're editing already uses; infrastructure modules are always imported through the `@ai-providers/*`, `@storage/*`, `@database/*` aliases.

## Logging

The app has a DI-injectable `AppLoggerService` (extends Nest's `ConsoleLogger`) in `src/shared/logger/`, wired globally via `LoggerModule` (HTTP interceptor + exception filter). New first-party services should be annotated with `@LogMethods()` (from `src/shared/logger/log-methods.decorator.ts`) to get automatic method-call logging. Any new outgoing client call should be wrapped in `AppLoggerService.trackExternalCall(...)`, mirroring `DeepSeekService.generate`. Logger constants/config live in `src/shared/constants/logger.ts` (and `LOG_LEVEL`/`LOG_PAYLOADS` in `config.ts`) — don't read `process.env` directly in logger code.
