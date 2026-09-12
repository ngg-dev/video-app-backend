---
name: add-nest-module
description: >-
  Scaffold a new NestJS feature module in this backend — controller, service,
  module files — and wire the module into AppModule's imports. Use when the
  user asks to add/create a new module, feature, resource, or domain
  (controller+service+module) to the app.
---

# Add NestJS Module

Scaffolds a standard Nest feature module under `src/<feature>/` (or
`src/<domain>/<feature>/` for a nested domain) and registers it in
`src/app.module.ts`.

## Steps

1. **Get the feature name** from the user (e.g. `create-video`,
   `generation-item`). Derive:
   - `kebab-case` for the directory and file names
   - `PascalCase` for class names (`FooBarModule`, `FooBarController`, `FooBarService`)
   - If the user names a parent domain (e.g. "generations"), nest it:
     `src/<domain>/<feature>/`. Otherwise scaffold directly under `src/<feature>/`.

2. **Check for collisions**: if `src/<path>/<feature>.module.ts` already
   exists, stop and ask before overwriting.

3. **Create the three files** using the templates below.

4. **Wire into `src/app.module.ts`**:
   - Add an import statement for the new module (path relative from `src/`,
     matching the relative-import style already used in `app.module.ts` for
     other feature modules, e.g. `./generations/generation-item/generation-item.module`).
   - Add the module class to the `imports: [...]` array, following the
     existing entries' order/grouping (feature modules are listed after infra
     modules like `TypeOrmModule`/`RedisModule`).

5. **Verify**: run `npm run typecheck` (and `npm run lint` if files were
   hand-edited) to confirm the new module compiles and is wired correctly.
   Do not run the full `npm run verify` unless asked.

## Templates

Given `Feature` = PascalCase name and `feature` = kebab-case name:

**`<feature>.module.ts`**
```ts
import { Module } from '@nestjs/common';
import { FeatureController } from './feature.controller';
import { FeatureService } from './feature.service';

@Module({
  controllers: [FeatureController],
  providers: [FeatureService],
})
export class FeatureModule {}
```

**`<feature>.controller.ts`**
```ts
import { Controller } from '@nestjs/common';
import { FeatureService } from './feature.service';

@Controller('feature')
export class FeatureController {
  constructor(private readonly featureService: FeatureService) {}
}
```

**`<feature>.service.ts`**
```ts
import { Injectable } from '@nestjs/common';
import { LogMethods } from 'src/shared/logger/log-methods.decorator';

@Injectable()
@LogMethods()
export class FeatureService {}
```

(Replace `Feature`/`feature` throughout with the actual names.)

## Notes

- Only scaffold empty bodies — don't invent endpoints, DTOs, or business
  logic the user didn't ask for. If the user describes concrete endpoints,
  add them; otherwise leave the class shells empty for the user to fill in.
- Add a `dto/` or `entities/` subdirectory only if the user's request implies
  one (e.g. they describe a request body or a persisted entity) — see
  `src/create-video/dto/` and `src/generations/generation-item/entities/` for
  the existing conventions.
- If the module needs another module's provider (e.g. `DeepSeekModule`), add
  it to `imports: []` in the new module and to the constructor of whichever
  class needs it, mirroring `src/create-video/create-video.module.ts`.
- Follow whichever import style (`src/...` absolute vs relative) the
  surrounding file already uses — this repo has no single enforced convention
  (see CLAUDE.md).
- New services should generally be decorated with `@LogMethods()` per this
  repo's logging conventions (see CLAUDE.md's Logging section) — include it
  unless the user says otherwise.
