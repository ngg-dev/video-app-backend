# Архитектура

## Граф модулей

```mermaid
flowchart TD
    subgraph Entry["Точка входа"]
        Main["main.ts<br/>bootstrap, ValidationPipe,<br/>глобальные обработчики ошибок"]
        App["AppModule"]
    end

    subgraph Infra["Инфраструктура"]
        Logger["LoggerModule (@Global)<br/>AppLoggerService, Interceptor,<br/>ExceptionFilter, MethodExplorer"]
        TypeOrm["TypeOrmModule.forRoot<br/>Postgres, autoLoadEntities"]
        Config["ConfigModule (isGlobal)"]
        Redis["RedisModule<br/>RedisService extends Redis"]
        Storage["StorageModule<br/>StorageService + S3Client"]
    end

    subgraph Providers["Провайдеры моделей"]
        DeepSeek["DeepSeekModule<br/>DeepSeekService.generate"]
        Xai["XaiModule<br/>XaiService.generate /<br/>generateImage / generateVideo"]
    end

    subgraph Domain["Доменные модули"]
        CreateVideo["CreateVideoModule<br/>CreateVideoService,<br/>CreateVideoCacheService"]
        Gallery["CharacterGalleryModule<br/>CharacterGalleryService,<br/>CharacterImageService,<br/>CharacterCollectionReaderService"]
    end

    Main --> App
    App --> Logger
    App --> Config
    App --> TypeOrm
    App --> Redis
    App --> Storage
    App --> DeepSeek
    App --> Xai
    App --> CreateVideo
    App --> Gallery

    CreateVideo --> DeepSeek
    CreateVideo --> Xai
    CreateVideo --> Storage
    CreateVideo --> Redis
    CreateVideo -.->|CharacterCollectionReaderService| Gallery

    Gallery --> Xai
    Gallery --> Storage

    Logger -.->|@LogMethods| CreateVideo
    Logger -.->|@LogMethods| Gallery
    Logger -.->|@LogMethods| DeepSeek
    Logger -.->|@LogMethods| Xai
    Logger -.->|@LogMethods| Storage
```

## Модули

| Модуль | Путь | Ответственность |
|---|---|---|
| `AppModule` | `src/app.module.ts` | Корневой модуль: собирает `ConfigModule`, `TypeOrmModule.forRoot`, `LoggerModule` и все доменные/инфраструктурные модули |
| `LoggerModule` | `src/shared/logger/logger.module.ts` | Глобальный (`@Global`) модуль логирования: `AppLoggerService`, HTTP-интерцептор, фильтр исключений, explorer методов — см. `logging.md` |
| `RedisModule` | `src/database/redis/redis.module.ts` | Глобальный модуль, экспортирует `RedisService` (клиент `ioredis`) |
| `StorageModule` | `src/storage/storage.module.ts` | `StorageService` — загрузка файлов в S3-совместимое хранилище, `StorageController` (`POST /storage/upload`) |
| `DeepSeekModule` | `src/ai-providers/deepseek/deepseek.module.ts` | `DeepSeekService.generate` — генерация текста через DeepSeek, `DeepSeekController` (`POST /deepseek/generate`) |
| `XaiModule` | `src/ai-providers/xai/xai.module.ts` | `XaiService` — текст/изображение/видео через xAI Grok Imagine, контроллеры `XaiTextController`, `XaiImageController` |
| `CreateVideoModule` | `src/create-video/create-video.module.ts` | `CreateVideoService` (конвейер создания видео), `CreateVideoCacheService` (кэш в Redis), `CreateVideoController` (`POST /create-video/create`) |
| `CharacterGalleryModule` | `src/character-gallery/character-gallery.module.ts` | `CharacterGalleryService` — персистенция персонажей/коллекций и разрешение стиля, `CharacterImageService` — генерация изображения персонажа (промпт → xAI → `StorageService`), `CharacterCollectionReaderService` — загрузка коллекции с персонажами (экспортируется, используется `CreateVideoModule`/`VideoPipeModule`), `CharacterGalleryController` |

## `src/main.ts`

Bootstrap создаёт приложение (`NestFactory.create(AppModule, { bufferLogs: true })`), подключает
`AppLoggerService` как логгер Nest, регистрирует глобальный `ValidationPipe` с `{ whitelist: true, transform:
true }` (незадекларированные поля тела запроса отбрасываются, примитивы приводятся к типам DTO),
подписывается на `unhandledRejection`/`uncaughtException` для логирования, и слушает порт из `PORT` (без
дефолта в коде — `process.env.PORT ?? 3000`).

## Конвенции `src/`

- **Конфигурация** — читается через `src/shared/constants/config.ts` (там — единственное место, где
  дергается `process.env` для большинства настроек), а не напрямую в сервисах. Честная оговорка: сам
  `src/app.module.ts` — исключение, он читает `DATABASE_*` и `NODE_ENV` из `process.env` напрямую в вызове
  `TypeOrmModule.forRoot`.
- **Сквозные константы и enum** — живут в `src/shared/constants/` (`config.ts`, `logger.ts`,
  `character-style.ts`, `deepseek.ts`, `xai.ts`, `video-aspect-ratio.ts`, `video-duration.ts`), а не
  разбросаны по entity/сервисам. Модуль-локальные константы — в `<module>/constants/` (например
  `src/media/constants/media.constant.ts`, `src/character-gallery/constants/character-gallery.constant.ts`).
- **Чистые функции** — переиспользуемая чистая логика (без ФС/сети/`this`) выносится в `<module>/utils/`
  (например `src/media/utils/ffmpeg-args.util.ts`) или в `src/shared/utils/` (например `withTempDir`,
  `extensionFromMediaType`), если нужна нескольким модулям.
- **Логирование новых сервисов** — класс сервиса помечается `@LogMethods()` (см. `logging.md`).
- **Исходящие вызовы** — новый вызов внешнего API/хранилища/кэша оборачивается в
  `AppLoggerService.trackExternalCall(...)`.
- **Стиль импортов** — в репозитории смешаны абсолютные импорты вида `src/...` (baseUrl — корень репозитория)
  и относительные (`../../../shared/...`); единой конвенции нет — следуй стилю файла, который редактируешь.

См. также [`flows.md`](./flows.md) (как модули используются в двух сквозных потоках) и
[`logging.md`](./logging.md) (устройство `LoggerModule`).
