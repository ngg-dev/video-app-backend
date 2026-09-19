# Известные проблемы

Перечисленные ниже пункты — находки по коду на момент написания документации. Ни один из них в рамках
этой документации не исправлен в коде: описание опечаток в публичных именах (см. п. 4) намеренно не
превращается в правку — `AGENTS.md` прямо требует сохранять `GenereationItemStatus` как есть, а не «чинить»
молча.

## 1. `ioredis` не объявлен в `package.json`, но используется — главная проблема

**Что.** `src/database/redis/redis.service.ts` делает `import Redis from 'ioredis'` и `RedisService extends
Redis`, при этом `ioredis` отсутствует и в `dependencies`, и в `devDependencies` `package.json`.

**Где.** `src/database/redis/redis.service.ts`, `package.json`.

**Последствие.** Локально `npm run typecheck` может проходить только если `ioredis` случайно резолвится из
внешнего (например, домашнего) `node_modules` разработчика. На чистой машине и в Docker-сборке (`npm ci`
внутри `Dockerfile`) зависимость не установится, и сборка/запуск сломаются.

**Статус.** Не исправлено — вне рамок задачи документирования (добавление зависимости — это правка
`package.json` и `src/**`, что явно запрещено этой задачей).

## 2. Пометка в `AGENTS.md` про `GenerationAttemptModule` уже неактуальна

**Что.** `AGENTS.md` в разделе Notes утверждает, что `AppModule` импортирует несуществующий
`GenerationAttemptModule` из `./generation-attempt/generation-attempt.module`, и что «приложение не
скомпилируется, пока это не исправлено».

**Где.** `AGENTS.md` (раздел Notes), `src/app.module.ts`.

**Последствие.** На текущем коде это уже не так: `src/app.module.ts` импортирует `GenerationItemModule` из
`./generations/generation-item/generation-item.module`, путь корректный, `npm run typecheck` проходит.

**Статус.** Устаревшая пометка, а не живая проблема; сам `AGENTS.md` в этой задаче не редактируется.

## 3. `npm run test:e2e` не работает

**Что.** Скрипт указывает на `./test/jest-e2e.json`, но каталога `test/` в репозитории нет. `npm run
format` и `npm run lint` тоже включают маску `test/**/*.ts` в свои команды.

**Где.** `package.json` (скрипты `test:e2e`, `format`, `format:check`, `lint`, `lint:fix`).

**Последствие.** `npm run test:e2e` завершается ошибкой; остальные скрипты не падают из-за отсутствующего
каталога (glob просто не находит файлов), но e2e-тестов в проекте фактически нет.

**Статус.** Не исправлено — создание каталога `test/` вне рамок этой задачи.

## 4. Опечатки в публичных именах — сознательно не чинятся

**Что.** В коде есть несколько опечаток в публичных именах:

- `GenereationItemStatus` (`src/shared/constants/generation-item.ts`) — имя enum;
- `creaate` (`src/create-video/create-video.controller.ts`) — имя метода контроллера;
- `gerenatete` и `GenerateResponsetDto` (`src/ai-providers/deepseek/deepseek.controller.ts`,
  `src/ai-providers/deepseek/dto/deepseek.dto.ts`) — имя метода контроллера и DTO;
- `characterСollectiorItemRepository` (`src/create-video/create-video.service.ts`) — приватное поле
  сервиса (кириллическая «С» в имени).

**Где.** См. пути выше.

**Последствие.** На HTTP-контракт эти опечатки не влияют (роуты и JSON-поля от них не зависят), но
усложняют чтение и грепинг кода.

**Статус.** Сознательно не исправлено. `AGENTS.md` прямо требует не «исправлять» `GenereationItemStatus`
молча — этот принцип распространён здесь на все перечисленные опечатки.

## 5. `GenerationItemModule` — заготовка, статусы нигде не переключаются

**Что.** `GenerationItemEntity` описывает полноценную асинхронную работу генерации (`status`,
`currentStep`, `script`, `audioUrl`, `videoUrl`, `videoStorageKey`, `error`), но
`GenerationItemService` умеет только `create`, а `CreateVideoService` — реальный конвейер — в эту таблицу
вообще ничего не пишет.

**Где.** `src/generations/generation-item/`, `src/create-video/create-video.service.ts`.

**Последствие.** Значения `GenereationItemStatus` (`PENDING`, `RUNNING`, `FAILED`, `COMPLETED`,
`WAITING_START`) нигде в приложении не меняются после создания записи — модуль существует отдельно от
реального конвейера.

**Статус.** Заготовка под будущую функциональность, не завершена.

## 6. Конвейер создания видео синхронный и долгий

**Что.** `POST /create-video/create` внутри одного HTTP-запроса делает два вызова DeepSeek, генерацию
изображения через xAI, загрузку в S3 и генерацию видео через xAI — последовательно.

**Где.** `src/create-video/create-video.service.ts`.

**Последствие.** Таймауты и очереди на уровне приложения не настроены; время ответа равно сумме времени
всех внешних вызовов. При медленном ответе одного из провайдеров клиент ждёт весь конвейер целиком.

**Статус.** Известное архитектурное ограничение, см. [`flows.md`](./flows.md), раздел «Синхронность».

## 7. Видео сцены не сохраняется в собственное хранилище

**Что.** `POST /create-video/create` возвращает `sceneVideoUrl`, полученный из
`providerMetadata.xai.videoUrl` — это ссылка самого провайдера xAI, а не файл в S3-совместимом хранилище
приложения.

**Где.** `src/create-video/create-video.service.ts`, `src/ai-providers/xai/xai.service.ts`.

**Последствие.** Срок жизни ссылки определяет провайдер, а не приложение. Redis хранит только эту ссылку с
TTL `3600` секунд (`CREATE_VIDEO_URL_TTL_SECONDS`), что соответствует терминам «Ссылка провайдера на
видео» и «TTL записи» в `CONTEXT.md` — это описание текущего поведения, а не однозначный баг.

**Статус.** Текущее поведение, зафиксировано как есть.

## 8. Кэш конвейера: ключ, префикс, деградация при ошибке Redis

**Что.** `CreateVideoCacheService` ключует запись по `sha256(scenario.toLowerCase() + '|' +
collectionId)` с префиксом `create-video:video-url:`. При ошибке Redis (`get` или `set`) исключение
логируется и проглатывается — запрос продолжается обычным путём без кэша.

**Где.** `src/create-video/create-video-cache.service.ts`,
`src/create-video/constants/video-url-storage.constant.ts`.

**Последствие.** Недоступность Redis не роняет `POST /create-video/create`, но приводит к повторной (более
дорогой) генерации на каждый запрос. Подробности — [`flows.md`](./flows.md), раздел «Кэш конвейера».

**Статус.** Осознанное поведение (деградация без падения), не баг.

## 9. Расхождение моделей в `XaiService.generateImage`

**Что.** Параметр `model` (по умолчанию `xaiModels.grok4`) в вызов генерации изображения не передаётся:
модель захардкожена как `xai.image('grok-imagine-image-2.0')`, и используется импортированный синглтон
`xai` из `@ai-sdk/xai`, а не сконфигурированный ключом `this.xaiSource` (`createXai({ apiKey: XAI_API_KEY
})`).

**Где.** `src/ai-providers/xai/xai.service.ts`, метод `generateImage`.

**Последствие.** `XAI_API_KEY` для генерации изображений фактически берётся синглтоном `xai` из переменной
окружения напрямую (поведение самого SDK `@ai-sdk/xai`), а не из `src/shared/constants/config.ts`, как для
остальных вызовов сервиса. Параметр `model` при вызове `generateImage` эффекта не имеет.

**Статус.** Не исправлено, вне рамок этой задачи.

## 10. `SCENARIO_GENERATE_PROMPT` объявлен, но не используется

**Что.** `src/shared/constants/create-video.ts` содержит большой промпт генерации сценария на русском
языке, но нигде в коде не импортируется и не используется.

**Где.** `src/shared/constants/create-video.ts`.

**Последствие.** Мёртвый код / заготовка под ненаписанную функциональность (генерация сценария из
пользовательского ввода).

**Статус.** Не используется, не удалён.

## 11. `synchronize: NODE_ENV !== 'production'`, миграций нет

**Что.** `TypeOrmModule.forRoot` в `src/app.module.ts` настроен с `synchronize: process.env.NODE_ENV !==
'production'`: вне production схема Postgres накатывается автоматически из сущностей при каждом старте
приложения.

**Где.** `src/app.module.ts`.

**Последствие.** Нет управляемой истории изменений схемы (миграций TypeORM в репозитории нет); поведение в
production (`synchronize: false`) и вне production отличается, что рискованно при переносе изменений схемы
в прод без миграций.

**Статус.** Известное ограничение, см. также [`data-model.md`](./data-model.md), раздел «Схема БД».

## 12. Отсутствие `.env.example` и полного списка переменных в репозитории

**Что.** В репозитории нет файла `.env.example`, при этом приложению нужно 18 переменных окружения (см.
[`development.md`](./development.md)), часть из которых (`DATABASE_HOST`, `DATABASE_PORT`, `DATABASE_USER`,
`DATABASE_PASSWORD`, `DATABASE_NAME`) не имеет дефолтов в коде.

**Где.** Корень репозитория (отсутствующий файл), `src/app.module.ts`, `src/shared/constants/config.ts`.

**Последствие.** Новому разработчику сложно понять, какие переменные нужны, без чтения исходников; без
`DATABASE_HOST`/`DATABASE_PORT` приложение не подключится к Postgres (`host: undefined`, `port: NaN`).

**Статус.** Не исправлено, вне рамок этой задачи — таблица переменных документирована в
[`development.md`](./development.md) как компенсация.

## Отдельно: корневой `README.md`

Корневой `README.md` — нетронутый boilerplate, сгенерированный `@nestjs/cli` (описание фреймворка NestJS,
ссылки на документацию, Discord, курсы, спонсоров). Он не описывает, что делает именно этот проект.
Переписывание `README.md` в рамках этой задачи не выполнялось (см. «Вне рамок задачи» в
`instructions/team-lead/PLAN-project-docs.md`); актуальное описание проекта — в
[`overview.md`](./overview.md) и остальных документах `docs/`.
