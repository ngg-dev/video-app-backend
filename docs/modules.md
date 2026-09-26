# Модули

Инфраструктурные модули лежат в `src/infrastructure/` (алиасы `@ai-providers/*`, `@storage/*`, `@database/*`), см. `docs/architecture.md`.

## `src/infrastructure/ai-providers/deepseek`

Обёртка над DeepSeek через Vercel AI SDK (`@ai-sdk/deepseek`, `generateText`).

- `DeepSeekService.generate({ model = deepSeekModels.v4Pro, prompt })` → строку с текстом
  (или `''`, если провайдер ничего не вернул). Вызов обёрнут в
  `AppLoggerService.trackExternalCall`.
- Модели: `src/shared/constants/deepseek.ts` (`v4Flash`, `v4Pro`, `chat`).
- API-ключ: `DEEPSEEK_API_KEY` (`src/shared/constants/config.ts`).
- `DeepSeekController` — `POST /deepseek/generate`.

## `src/infrastructure/ai-providers/xai`

Обёртка над xAI (Grok) — текст, изображения, видео.

- `XaiService.generate` — текст (`generateText`).
- `XaiService.generateImage` — изображение (Grok Imagine Image 2.0), принимает
  `referenceImages` и `aspectRatio`.
- `XaiService.generateVideo` — видео (Grok Imagine Video 1.5 по умолчанию), принимает
  `referenceImageUrls`, `resolution`, `duration`; возвращает `{ video, videoUrl }`
  (`videoUrl` — из `providerMetadata.xai.videoUrl`).
- Модели: `src/shared/constants/xai.ts`. API-ключ: `XAI_API_KEY`.
- Билдеры опций запроса — `src/infrastructure/ai-providers/xai/utils/xai-request-builders.util.ts`.
- Контроллеры: `XaiTextController` (`POST /xai/text/generate`),
  `XaiImageController` (`POST /xai/image/generate`).

## `src/character-gallery`

Персонажи и коллекции персонажей (Postgres, TypeORM).

- **Entities** (`entities/character-item.entity.ts`):
  - `CharacterItemEntity` (`character_items`) — `name`, `description`, `style`, `imageUrl`,
    `collectionId`.
  - `CharacterCollectionItemEntity` (`character_collection_items`) — `title`, `style`.
- **`CharacterGalleryService`** — персистентность: создание персонажа (резолвит стиль —
  из коллекции, если указана `collectionId`, иначе из DTO) и создание коллекции.
- **`CharacterImageService`** — генерация мастер-листа персонажа: промпт
  (`utils/character-sheet-prompt.util.ts`) → `XaiService.generateImage` → `StorageService`.
  Специально отделён от `CharacterGalleryService`, чтобы не смешивать генерацию и
  персистентность.
- **`CharacterCollectionReaderService`** — грузит коллекцию + её персонажей одним вызовом,
  проверяет, что у коллекции задан стиль (`assertCollectionHasStyle`, иначе
  `NotFoundException`/`BadRequestException`). Общий сервис, используется
  `CreateVideoModule` и `VideoPipeModule`.
- **`utils/character-collection.util.ts`**:
  - `assertCollectionHasStyle` — все сцены одного ролика должны иметь единый стиль, и он
    берётся только из коллекции.
  - `selectMentionedCharacters(scenario, characters)` — выбирает персонажей, упомянутых по
    имени в (уже нормализованном) сценарии, и собирает их референс-картинки в том же
    порядке.
- Контроллер: `CharacterGalleryController` — `POST /character-gallery/create`,
  `POST /character-gallery/collection/create`.

## `src/create-video`

Генерация одной сцены: картинка → видео, с кэшированием в Redis.

- **`CreateVideoService.createVideoPipe(dto)`**:
  1. Нормализует сценарий (`utils/scenario.util.ts`).
  2. Проверяет кэш (`CreateVideoCacheService.get`, ключ — hash сценария+коллекции).
  3. Если `collection`/`characters` не переданы вызывающим (внутренний вызов из
     `VideoPipeService`) — грузит их через `CharacterCollectionReaderService`.
  4. `selectMentionedCharacters` — определяет, какие персонажи участвуют в сцене.
  5. `CreateVideoPromptService.buildScenePrompt` → `XaiService.generateImage` →
     `StorageService.uploadGeneratedFile` (S3, prefix `scenes`).
  6. `CreateVideoPromptService.buildVideoPrompt` → `XaiService.generateVideo`
     (720p, `duration` из запроса).
  7. Кэширует результат (`CreateVideoCacheService.set`).
- **`CreateVideoPromptService`** — строит промпты для DeepSeek на основе шаблонов
  (`constants/scene-prompt.constant.ts`), с учётом персонажей, стиля и aspect ratio;
  при пустом ответе DeepSeek — фолбэк на исходный сценарий/шаблонный промпт.
- **`CreateVideoCacheService`** — Redis-кэш `CreateVideoResponseDto` по
  `sha256(normalizedScenario|collectionId)`, TTL из
  `constants/video-url-storage.constant.ts`. Ошибки Redis не приводят к падению запроса
  (логируются, кэш просто не используется).
- **DTO** (`dto/create-video.dto.ts`): `CreateRequestDto` (`scenario`, `collectionId`,
  опционально `aspectRatio`, `duration`; поля `collection`/`characters` — только для
  внутренних вызовов, намеренно без валидаторов, никогда не приходят из HTTP-тела).
- Контроллер: `CreateVideoController` — `POST /create-video/create`.

## `src/video-pipe`

Генерация набора сцен единым стилем и их склейка в один ролик.

- **`VideoPipeService.createVideoPipeline(dto)`**:
  1. Грузит коллекцию персонажей один раз (`CharacterCollectionReaderService`).
  2. Параллельно вызывает `CreateVideoService.createVideoPipe` для каждого сценария,
     передавая уже загруженные `collection`/`characters` (без повторных запросов в БД).
  3. `VideoAssemblyService.concatNormalizedAndGetUrl` — скачивает video-части, склеивает
     через ffmpeg под целевой aspect ratio, грузит результат в S3.
  4. Инвалидирует кэш использованных сценариев (`CreateVideoCacheService.delMany`).
- Число сцен в запросе равно длине `scenarios`: нижний предел — непустой массив (`@ArrayNotEmpty`),
  верхнего предела нет.
- Контроллер: `VideoPipeController` — `POST /video-pipe/create`.

## `src/media`

Разделение "построить и выполнить ffmpeg-команду" / "оркестрация I/O".

- **`FfmpegService`** (`ffmpeg/`) — низкоуровневый запуск ffmpeg-процесса, получение
  метаданных видео (`getVideoDimensions`).
- **`MediaService`** — только ffmpeg-операции, без сети/файловой оркестрации:
  `trim`, `trimToShorts` (кроп в 9:16 для Shorts), `concat` (concat demuxer, `-c copy`),
  `concatNormalized`/`concatNormalizedVertical` (пересборка через filter graph с
  ре-энкодом — нужна из-за дрейфа параметров потока между сгенерированными клипами,
  который иначе ломает геометрию кадра у части плееров), `mergeAudio`, `burnSubtitles`.
  Билдеры аргументов ffmpeg — `utils/ffmpeg-args.util.ts`; кроп-геометрия и экранирование
  путей для фильтров — `utils/media-path.util.ts`.
- **`VideoAssemblyService`** — оркестрация вокруг `MediaService`: скачивает части во
  временную директорию (`withTempDir`), вызывает нужный concat-шаг, грузит результат в
  `StorageService`, чистит за собой. Методы: `concatAndGetUrl`,
  `concatNormalizedVerticalAndGetUrl`, `concatNormalizedAndGetUrl` (произвольный размер +
  key prefix — используется `VideoPipeService`).
- Контроллер: `MediaController` — `POST /media/trim-to-shorts`, `POST /media/concat`,
  `POST /media/concat-and-get-url`, `POST /media/concat-normalized-vertical`.

## `src/infrastructure/storage`

Загрузка/удаление файлов в S3-совместимое хранилище (по умолчанию Yandex Object Storage).

- **`StorageService`**: `upload(key, body, contentType)`,
  `uploadGeneratedFile(file, prefix, fallbackExtension)` (для AI-сгенерированных файлов —
  расширение выводится из `mediaType`), `getPublicUrl(key)`, `delete(key)`, `exists(key)`.
  Все вызовы к S3 — через `AppLoggerService.trackExternalCall`.
- S3-клиент — `utils/s3-client.ts` (провайдер `S3_CLIENT`), конфиг —
  `constants/storage.constants.ts` (`STORAGE_BUCKET`, `STORAGE_ENDPOINT`, регион, креды —
  из `src/shared/constants/config.ts`).
- Контроллер: `StorageController` — `POST /storage/upload` (multipart, поле `file`,
  опциональный query `prefix`).

## `src/infrastructure/database/redis`

`RedisService extends Redis` (ioredis) — простой DI-обёртка, конфиг из `REDIS_HOST`/
`REDIS_PORT`. Используется `CreateVideoCacheService`.

## `src/shared`

- **`constants/`** — сквозные константы: `config.ts` (единая точка чтения `process.env`),
  `logger.ts`, `deepseek.ts`, `xai.ts`, `video-aspect-ratio.ts` (enum + размеры под каждый
  aspect ratio), `video-duration.ts` (мин/макс/дефолт длительность сцены),
  `character-style.ts`, `create-video.ts`.
- **`logger/`** — `AppLoggerService`, `LoggerModule` (HTTP-интерцептор
  `logging.interceptor.ts` + `all-exceptions.filter.ts`), декоратор `@LogMethods()` и его
  "исследователь" (`method-logging.explorer.ts`, находит помеченные сервисы через
  metadata), `sanitize.ts` (маскирование чувствительных полей перед логированием).
- **`utils/`** — переиспользуемая чистая логика: тайп-гарды null/undefined
  (`is-null-or-undefined`), `download-binary`, `extension-from-media-type`,
  `is-transient-network-error`, `retry-async-on-transient-failure`, `sleep`, `with-temp-dir`
  (создаёт и гарантированно удаляет временную директорию).
