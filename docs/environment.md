# Переменные окружения

Все читаются один раз в `src/shared/constants/config.ts` (сервисы и модуль-локальные
константы импортируют их оттуда, а не читают `process.env` напрямую — исключение сделано
только для `PORT` и `NODE_ENV` в `src/main.ts`/`config.ts`). `.env` подключается через
`dotenv/config` в `src/main.ts` и `ConfigModule.forRoot({ isGlobal: true })`.

| Переменная | Обязательна | По умолчанию | Назначение |
|---|---|---|---|
| `PORT` | нет | `3000` | Порт HTTP-сервера |
| `NODE_ENV` | нет | `development` | Влияет на `synchronize` TypeORM (выключен в `production`) и дефолт `LOG_LEVEL`/`LOG_PAYLOADS` |
| `DATABASE_HOST` | да | — | Postgres |
| `DATABASE_PORT` | да | — | Postgres |
| `DATABASE_USER` | да | — | Postgres |
| `DATABASE_PASSWORD` | да | — | Postgres |
| `DATABASE_NAME` | да | — | Postgres |
| `REDIS_HOST` | нет | `localhost` | Кэш сцен (`CreateVideoCacheService`) |
| `REDIS_PORT` | нет | `6379` | Кэш сцен |
| `DEEPSEEK_API_KEY` | да (для генерации промптов) | `''` | `DeepSeekService` |
| `XAI_API_KEY` | да (для генерации картинок/видео) | `''` | `XaiService` |
| `AWS_KEY_ID` | да | `''` | S3-совместимое хранилище |
| `AWS_SECRET_KEY` | да | `''` | S3-совместимое хранилище |
| `BUCKET_NAME` | да | `''` | Бакет для загрузок |
| `STORAGE_REGION` | нет | `ru-central1` | Yandex Object Storage |
| `STORAGE_ENDPOINT` | нет | `https://storage.yandexcloud.net` | S3 endpoint |
| `LOG_LEVEL` | нет | `debug` (`log` в `production`) | `'verbose' \| 'debug' \| 'log' \| 'warn' \| 'error' \| 'fatal'` |
| `LOG_PAYLOADS` | нет | `true` (`false` в `production`) | Логировать ли тела запросов/ответов (`'true'`/`'false'`) |

## Логирование: маскирование

`src/shared/logger/sanitize.ts` перед логированием маскирует значения по ключам
`apiKey`, `password`, `token`, `authorization`, `secret` (`LOG_REDACTED_KEYS` в
`src/shared/constants/logger.ts`) и обрезает длинные строки/массивы/глубину объекта
(`LOG_MAX_STRING_LENGTH`, `LOG_MAX_ARRAY_ITEMS`, `LOG_MAX_DEPTH`).

## Прочие модуль-локальные константы (не из env)

- `CREATE_VIDEO_URL_TTL_SECONDS = 3600` — TTL кэша сцены в Redis
  (`src/create-video/constants/video-url-storage.constant.ts`).
- `VIDEO_PIPE_SCENE_COUNT = 5` — сколько сценариев обязан прислать `POST /video-pipe/create`
  (`src/video-pipe/constants/video-pipe.constant.ts`).
- `MIN_VIDEO_DURATION_SECONDS = 1`, `MAX_VIDEO_DURATION_SECONDS = 15`,
  `DEFAULT_VIDEO_DURATION_SECONDS = 5` (`src/shared/constants/video-duration.ts`).
- `DEFAULT_VIDEO_ASPECT_RATIO = '9:16'`, размеры по aspect ratio
  (`src/shared/constants/video-aspect-ratio.ts`).
