# Логирование

Всё логирование настроено глобально в `LoggerModule` (`src/shared/logger/logger.module.ts`, `@Global()`) и
работает на трёх уровнях: HTTP, методы сервисов, внешние вызовы. Все события идут через `AppLoggerService`
(`src/shared/logger/logger.service.ts`, расширяет `ConsoleLogger`).

## Уровень 1: HTTP

`LoggingInterceptor` (зарегистрирован как `APP_INTERCEPTOR`) логирует каждый HTTP-запрос/ответ:

- `http.request` — при входе запроса.
- `http.response` — при завершении, с `durationMs`.

`AllExceptionsFilter` (`APP_FILTER`) ловит необработанные исключения на уровне HTTP-слоя.

## Уровень 2: методы сервисов

`MethodLoggingExplorer` через `DiscoveryModule` находит все классы, помеченные декоратором `@LogMethods()`
(`src/shared/logger/log-methods.decorator.ts` — обёртка над `SetMetadata`), и оборачивает их методы
автоматическим логированием вызовов:

- `method.start` — перед вызовом метода.
- `method.end` — после успешного завершения, с `durationMs` и (если включена санитизация payload'ов)
  результатом.
- `method.error` — при исключении, с `durationMs` и санитизированной ошибкой.

## Уровень 3: внешние вызовы

`AppLoggerService.trackExternalCall({ provider, operation, request }, fn, mapResponse?)` оборачивает
асинхронный вызов внешнего клиента:

- `external.request` — перед вызовом.
- `external.response` — после успеха, с `durationMs` и (опционально) результатом `mapResponse`.
- `external.error` — при ошибке, с `durationMs` и санитизированной ошибкой (вызов пробрасывается дальше).

Провайдеры, уже обёрнутые `trackExternalCall` на сегодня: `deepseek` (`DeepSeekService.generate`), `xai`
(`XaiService.generate` / `generateImage` / `generateVideo`), `s3` (`StorageService`), `redis`
(`CreateVideoCacheService.get`/`set`).

## Имена событий

Все имена определены в `LOG_EVENT` (`src/shared/constants/logger.ts`):

| Константа | Значение |
|---|---|
| `HTTP_REQUEST` | `http.request` |
| `HTTP_RESPONSE` | `http.response` |
| `METHOD_START` | `method.start` |
| `METHOD_END` | `method.end` |
| `METHOD_ERROR` | `method.error` |
| `EXTERNAL_REQUEST` | `external.request` |
| `EXTERNAL_RESPONSE` | `external.response` |
| `EXTERNAL_ERROR` | `external.error` |
| `UNHANDLED_REJECTION` | `unhandled.rejection` |
| `UNCAUGHT_EXCEPTION` | `uncaught.exception` |

Последние два используются в `src/main.ts` при подписке на `process.on('unhandledRejection'/
'uncaughtException')`, а не одним из трёх уровней выше.

## Санитизация

`sanitizeForLog` (`src/shared/logger/sanitize.ts`) применяется к payload'ам (аргументам/результатам методов,
телу HTTP-запроса/ответа, request/response внешних вызовов) и к ошибкам:

- строки длиннее лимита обрезаются с суффиксом `…(+N chars)`;
- массивы длиннее лимита обрезаются с элементом `…(+N items)`;
- объекты глубже лимита схлопываются в `[Object]`/`[Array]`;
- циклические ссылки заменяются на `[Circular]`;
- `Buffer` заменяется на `[Buffer: N bytes]`;
- `Error` сериализуется в `{ name, message, stack }` (с усечением `message`/`stack`);
- значения ключей из списка редактируемых заменяются на `[REDACTED]` (регистронезависимо по имени ключа).

Лимиты и ключи (`src/shared/constants/logger.ts`):

| Константа | Значение |
|---|---|
| `LOG_MAX_STRING_LENGTH` | `500` |
| `LOG_MAX_ARRAY_ITEMS` | `20` |
| `LOG_MAX_DEPTH` | `4` |
| `LOG_REDACTED_KEYS` | `apiKey`, `password`, `token`, `authorization`, `secret` |
| `LOG_REDACTED_PLACEHOLDER` | `[REDACTED]` |

## Управление

- `LOG_LEVEL` (`src/shared/constants/config.ts`) — из переменной окружения `LOG_LEVEL`, дефолт `log` в
  production (`NODE_ENV === 'production'`) и `debug` во всех остальных случаях.
- `LOG_PAYLOADS` (там же) — из `LOG_PAYLOADS` (`'true'`/иное), дефолт: включено везде, кроме production.
  Когда выключено, `AppLoggerService` не прикладывает к событиям тела запросов/ответов, аргументы и
  результаты методов (поле остаётся `undefined`).
- `AppLoggerService` объявлен с `Scope.TRANSIENT` — каждая точка инъекции получает собственный экземпляр
  `ConsoleLogger`; настроенные уровни (`resolveLogLevels(LOG_LEVEL)`) применяются в конструкторе самого
  сервиса, поэтому каждый инстанс уже сконфигурирован правильно, а не только тот, что резолвится в
  `main.ts` через `app.resolve(AppLoggerService)`.

## Как подключить логирование в новом сервисе

1. Пометить класс сервиса декоратором `@LogMethods()` — это включает логирование `method.start` /
   `method.end` / `method.error` для всех его методов через `MethodLoggingExplorer`.
2. Любой новый исходящий вызов (к БД-клиенту, внешнему API, кэшу и т. п.) обернуть в
   `AppLoggerService.trackExternalCall({ provider, operation, request }, () => fn(), mapResponse?)`.

Пример — `DeepSeekService.generate` (`src/infrastructure/ai-providers/deepseek/services/deepseek.service.ts`): класс помечен
`@LogMethods()`, а сам вызов `generateText` обёрнут в `this.logger.trackExternalCall({ provider: 'deepseek',
operation: 'generateText', request: { model, promptLength, prompt } }, () => generateText(...), (response) =>
({ finishReason, usage, textLength }))`.
