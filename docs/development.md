# Разработка

## Предварительные требования

- **Node.js** — сборка Docker-образа использует `node:20-alpine` (см. `Dockerfile`); локально рекомендуется
  Node 20.
- **Postgres** — приложение подключается через TypeORM (`type: 'postgres'`, драйвер `pg`).
- **Redis** — используется `RedisService extends Redis` (пакет `ioredis`) для кэша конвейера создания
  видео. См. [`known-issues.md`](./known-issues.md) — `ioredis` не объявлен в `package.json`.

## Подъём инфраструктуры

`docker-compose.yaml` поднимает Postgres и Redis для локальной разработки:

- `postgres` — образ `postgres:15-alpine`, порт по умолчанию `5432` (`${DATABASE_PORT:-5432}` на хосте),
  пользователь/пароль/база — из `DATABASE_USER`/`DATABASE_PASSWORD`/`DATABASE_NAME` (дефолты
  `postgres`/`secret`/`db` заданы только в `docker-compose.yaml`, не в приложении).
- `redis` — образ `redis:7-alpine`, порт по умолчанию `6379` (`${REDIS_PORT:-6379}`).

```bash
docker compose up -d
```

## Переменные окружения

Полный список переменных, которые читает приложение (`.env.example` в репозитории нет).

| Переменная | Где читается | Дефолт | Обязательна |
|---|---|---|---|
| `DEEPSEEK_API_KEY` | `src/shared/constants/config.ts` | `''` | да (для реальных вызовов DeepSeek) |
| `XAI_API_KEY` | `src/shared/constants/config.ts` | `''` | да (для реальных вызовов xAI) |
| `DATABASE_HOST` | `src/app.module.ts` (напрямую из `process.env`) | нет — `undefined` | да |
| `DATABASE_PORT` | `src/app.module.ts` (напрямую из `process.env`) | нет — `Number(undefined)` → `NaN` | да |
| `DATABASE_USER` | `src/app.module.ts` (напрямую из `process.env`) | нет | да |
| `DATABASE_PASSWORD` | `src/app.module.ts` (напрямую из `process.env`) | нет | да |
| `DATABASE_NAME` | `src/app.module.ts` (напрямую из `process.env`) | нет | да |
| `REDIS_HOST` | `src/shared/constants/config.ts` | `'localhost'` | нет |
| `REDIS_PORT` | `src/shared/constants/config.ts` | `6379` | нет |
| `NODE_ENV` | `src/shared/constants/config.ts` и `src/app.module.ts` (в обоих местах) | `'development'` (в `config.ts`; в `app.module.ts` дефолта нет, сравнение с `'production'`) | нет |
| `LOG_LEVEL` | `src/shared/constants/config.ts` | `'log'` в production, иначе `'debug'` | нет |
| `LOG_PAYLOADS` | `src/shared/constants/config.ts` | включено везде, кроме production | нет |
| `AWS_KEY_ID` | `src/shared/constants/config.ts` | `''` | да (для загрузки в S3) |
| `AWS_SECRET_KEY` | `src/shared/constants/config.ts` | `''` | да (для загрузки в S3) |
| `BUCKET_NAME` | `src/shared/constants/config.ts` | `''` | да (для загрузки в S3) |
| `STORAGE_REGION` | `src/shared/constants/config.ts` | `'ru-central1'` | нет |
| `STORAGE_ENDPOINT` | `src/shared/constants/config.ts` | `'https://storage.yandexcloud.net'` | нет |
| `PORT` | `src/main.ts` (напрямую из `process.env`) | `3000` | нет |

`DATABASE_HOST` и `DATABASE_PORT` не имеют дефолтов: без них `TypeOrmModule.forRoot` получит `host:
undefined, port: NaN`, и приложение не поднимется. Файла `.env.example` в репозитории нет — переменные нужно
задавать вручную по таблице выше.

## npm-скрипты

Из `package.json`:

| Скрипт | Назначение |
|---|---|
| `start` | `nest start` |
| `start:dev` | `nest start --watch` |
| `start:debug` | `nest start --debug --watch` |
| `start:prod` | `node dist/main` (используется в `Dockerfile`) |
| `build` | `nest build` |
| `lint` | `eslint "{src,apps,libs,test}/**/*.ts"`, без автофикса |
| `lint:fix` | то же с `--fix` |
| `format` | `prettier --write "src/**/*.ts" "test/**/*.ts"` |
| `format:check` | `prettier --check` той же маски |
| `typecheck` | `tsc --noEmit -p tsconfig.json` |
| `compile:test` | `tsc --noEmit -p tsconfig.build.json` — проверяет, что прод-сборка компилируется, без записи файлов |
| `test` | `jest` (юнит-тесты `*.spec.ts`, `rootDir: src`) |
| `test:watch` | `jest --watch` |
| `test:cov` | `jest --coverage` |
| `test:debug` | запуск jest под `--inspect-brk` |
| `test:e2e` | `jest --config ./test/jest-e2e.json` — **сейчас нерабочий**: каталога `test/` в репозитории нет |
| `verify` | `npm run lint && npm run typecheck && npm test` — рекомендуемая проверка перед тем, как считать изменение готовым |

## Запуск одного файла / одного теста jest

```bash
npx jest path/to/file.spec.ts
npx jest path/to/file.spec.ts -t "test name"
```

## Docker и Kubernetes

`Dockerfile` — двухэтапная сборка: этап `builder` на `node:20-alpine` ставит все зависимости (`npm ci`) и
собирает (`npm run build`); финальный этап `runner` ставит только production-зависимости (`npm ci
--only=production`), копирует `dist/`, выставляет `NODE_ENV=production`, открывает порт `3000` и запускает
`npm run start:prod`.

`k8s-deploy.yaml` описывает `Deployment` (1 реплика, образ `backend:v1`, `imagePullPolicy: Never` — под
локальный k3d), `Service` (порт `80` → `targetPort: 3000`) и `Ingress` без TLS.
