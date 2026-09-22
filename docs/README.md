# Документация backend

NestJS + TypeORM (Postgres) сервис для генерации видео из сценариев: текстовые/визуальные
промпты идут в DeepSeek и xAI (Grok), готовые сцены склеиваются через ffmpeg и грузятся
в S3-совместимое хранилище (Yandex Object Storage).

## Разделы

- [architecture.md](./architecture.md) — общая архитектура, модули, поток данных, инфраструктура.
- [modules.md](./modules.md) — подробное описание каждого модуля (`src/<domain>`).
- [api.md](./api.md) — HTTP endpoints по контроллерам.
- [environment.md](./environment.md) — переменные окружения и конфигурация.

## Быстрый старт

```bash
npm install
npm run start:dev      # http://localhost:3000, watch mode
```

Перед коммитом:

```bash
npm run verify          # lint + typecheck + test
```

Полный список команд — в корневом [AGENTS.md](../AGENTS.md).
