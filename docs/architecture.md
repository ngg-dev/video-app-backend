# Архитектура

## Слой `src/infrastructure`

Адаптеры внешних систем: `ai-providers/{deepseek,xai,runware}`, `storage`, `database/redis`. Структура модуля:
`*.module.ts` в корне, подпапки `controllers/`, `services/`, `dto/`, `types/`, `utils/`, `constants/`, спеки в
`__tests__/`. Алиасы (tsconfig `paths` + jest `moduleNameMapper`): `@ai-providers/*`, `@storage/*`,
`@database/*`, `@infrastructure/*` (для будущих групп). Потребители вне модуля импортируют через алиас
группы, внутри модуля — относительные пути; инфраструктура не импортирует домен.

## Стек

- **NestJS 11** (Express) — HTTP API, DI.
- **TypeORM 0.3 + Postgres** — персистентность (`character-gallery`). `TypeOrmModule.forRoot`
  в `src/app.module.ts` читает `DATABASE_*` из окружения, `autoLoadEntities: true`,
  `synchronize` включён везде кроме `NODE_ENV=production`.
- **ioredis** (`src/infrastructure/database/redis/`) — кэш результатов генерации сцен.
- **Vercel AI SDK (`ai`)** + `@ai-sdk/deepseek`, `@ai-sdk/xai` — обёртки над LLM/image/video
  провайдерами (DeepSeek, xAI Grok).
- **fluent** ffmpeg-обвязка (`src/media/ffmpeg`) — сборка видео из сгенерированных клипов.
- **@aws-sdk/client-s3** — загрузка файлов в S3-совместимое хранилище (Yandex Object Storage
  по умолчанию).
- **class-validator / class-transformer** — валидация DTO, включён глобальный
  `ValidationPipe({ whitelist: true, transform: true })` (`src/main.ts`).

## Модули верхнего уровня

`src/app.module.ts` собирает:

- `LoggerModule` — глобальный логгер + HTTP-интерцептор + exception filter.
- `ConfigModule.forRoot({ isGlobal: true })` — `.env` через `dotenv/config`.
- `TypeOrmModule.forRoot(...)` — подключение к Postgres.
- `DeepSeekModule`, `XaiModule` — AI-провайдеры.
- `RedisModule` — кэш.
- `CharacterGalleryModule` — персонажи и коллекции персонажей.
- `StorageModule` — загрузка файлов в S3.
- `MediaModule` — ffmpeg-операции и сборка видео из частей.
- `CreateVideoModule` — генерация одной сцены (картинка → видео).
- `VideoPipeModule` — генерация нескольких сцен единым стилем и их склейка в один ролик.

## Поток генерации видео (основной сценарий)

```
VideoPipeController → VideoPipeService
  1. CharacterCollectionReaderService — грузит коллекцию персонажей + стиль
  2. Для каждого сценария параллельно: CreateVideoService.createVideoPipe(...)
       a. CreateVideoCacheService.get — проверка кэша в Redis по hash(сценарий+коллекция)
       b. CreateVideoPromptService — строит промпт сцены (DeepSeek/шаблоны)
       c. XaiService.generateImage — картинка сцены (Grok Imagine Image)
       d. StorageService.uploadGeneratedFile — картинка → S3
       e. CreateVideoPromptService — строит промпт видео
       f. XaiService.generateVideo — видео сцены (Grok Imagine Video)
       g. CreateVideoCacheService.set — кэш результата (TTL)
  3. VideoAssemblyService.concatNormalizedAndGetUrl — скачивает все part-видео,
     склеивает через ffmpeg (нормализация под целевой aspect ratio), грузит в S3
  4. CreateVideoCacheService.delMany — инвалидация кэша по использованным сценариям
```

`CreateVideoService` также используется напрямую (`POST /create-video/create`) для генерации
одной сцены без склейки.

## Разделение ответственности (паттерн сервис/оркестрация)

Проект последовательно разносит "построить и выполнить ffmpeg/API-команду" и
"скачать/сохранить/убрать за собой":

- `src/media/`: `MediaService` — только ffmpeg-команды (обёртка над `FfmpegService`);
  `VideoAssemblyService` — скачивание частей, вызов `MediaService`, загрузка результата в
  `StorageService`, уборка временных файлов.
- `src/character-gallery/`: `CharacterGalleryService` — персистентность и резолв стиля;
  `CharacterImageService` — промпт → xAI → storage. Общий
  `CharacterCollectionReaderService` (грузит коллекцию с персонажами) используется и
  `CreateVideoModule`, и `VideoPipeModule`.

Общие сквозные константы/enum — в `src/shared/constants/`, модуль-локальные — в
`<module>/constants/`. Переиспользуемая чистая логика — в `<module>/utils/` или
`src/shared/utils/`, не в сущностях/сервисах.

## Логирование

`AppLoggerService` (`src/shared/logger/logger.service.ts`) расширяет `ConsoleLogger`,
подключается глобально через `LoggerModule` (HTTP-интерцептор + exception filter).
Сервисы, помеченные декоратором `@LogMethods()` (`src/shared/logger/log-methods.decorator.ts`),
автоматически логируют вызовы методов (старт/конец/ошибка, с длительностью).
Любой исходящий вызов к внешнему сервису (DeepSeek, xAI, S3, Redis) оборачивается в
`AppLoggerService.trackExternalCall(...)` — логирует запрос/ответ/ошибку и длительность,
по образцу `DeepSeekService.generate`. Payload-логирование (тела запросов/ответов)
управляется `LOG_PAYLOADS`, уровень — `LOG_LEVEL` (`src/shared/constants/config.ts`,
`src/shared/constants/logger.ts`).

## Null/undefined

Проверки на `null`/`undefined` идут через тайп-гарды в `src/shared/utils`
(`isNull`/`isNotNull`/`isUndefined`/`isNotUndefined`/`isNullOrUndefined`/
`isNotNullOrUndefined`) — не через прямые сравнения с литералами `null`/`undefined` или
`typeof x === 'undefined'` (кроме самого файла с их реализацией).

## Импорты

В коде встречаются оба стиля: абсолютные `src/...` (baseUrl — корень репозитория) и
относительные (`../../../shared/...`) — единой конвенции нет, при правке файла следует
следовать стилю, уже принятому в этом файле.
