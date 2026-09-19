# HTTP API

`@nestjs/swagger` в проекте не подключён — эта таблица поддерживается вручную и должна обновляться вместе с
контроллерами/DTO.

Глобальный `ValidationPipe` (`src/main.ts`) настроен с `{ whitelist: true, transform: true }`:
незадекларированные в DTO поля тела запроса отбрасываются, а поля приводятся к типам, описанным в DTO.

## Эндпоинты

| Метод | Путь | Контроллер | Тело / параметры | Ответ |
|---|---|---|---|---|
| GET | `/` | `AppController` | — | строка приветствия |
| POST | `/create-video/create` | `CreateVideoController.creaate` | `CreateRequestDto`: `scenario` (строка, 1..100000), `collectionId` (строка) | `CreateVideoResponseDto`: `{ sceneImageUrl, sceneVideoUrl }` |
| POST | `/character-gallery/create` | `CharacterGalleryController.createCharacter` | `CreateCharacterDto`: `name` (≤255), `prompt` (≤100000), `style?` (строка, ≤255), `collectionId?` | `CharacterItemEntity` |
| POST | `/character-gallery/collection/create` | `CharacterGalleryController.createCharacterCollection` | `CreateCharacterCollectionDto`: `name` (≤255), `style?` (enum `CharacterStyle`: `anime`, `pixar3d`) | `CharacterCollectionItemEntity` |
| POST | `/generation-item/create` | `GenerationItemController.createItem` | `CreateGenerationItemDto`: `status?` (enum `GenereationItemStatus`) | `GenerationItemEntity` |
| POST | `/storage/upload` | `StorageController.upload` | multipart/form-data, поле `file`; query `prefix?` (по умолчанию `images/`, должен соответствовать `/^[a-z0-9/_-]+$/i`, иначе используется дефолт) | `UploadResponseDto`: `{ message, url, key, etag? }` |
| POST | `/deepseek/generate` | `DeepSeekController.gerenatete` | `GenerateRequestDto`: `prompt` (строка, ≤100000) | `GenerateResponsetDto`: `{ message }` |
| POST | `/xai/text/generate` | `XaiTextController.generate` | `GenerateTextRequestDto`: `prompt` (строка, ≤100000) | `GenerateTextResponseDto`: `{ message }` |
| POST | `/xai/image/generate` | `XaiImageController.generate` | `GenerateImageRequestDto`: `prompt` (строка, ≤100000), `referenceImages?` (string[]), `aspectRatio?` (`` `${number}:${number}` ``) | `GenerateImageResponseDto`: `{ base64, mediaType }` |

Имена методов контроллеров приведены как в коде, включая опечатки `creaate` и `gerenatete` — они не
исправлены намеренно (см. [`known-issues.md`](./known-issues.md), `AGENTS.md`).

## Примеры

### `POST /create-video/create`

Запрос:

```json
{
  "scenario": "Alice walks into the tavern and greets Bob.",
  "collectionId": "b6f2b2a0-2f34-4a3e-9e8e-9a1a6b8c0e11"
}
```

Ответ `200`:

```json
{
  "sceneImageUrl": "https://storage.yandexcloud.net/bucket/scenes/1732012345678-6d0e...-c2.png",
  "sceneVideoUrl": "https://provider.example.com/videos/6f21...c8.mp4"
}
```

### `POST /character-gallery/create`

Запрос:

```json
{
  "name": "Alice",
  "prompt": "A young adventurer with a red cloak, turnaround reference sheet.",
  "style": "anime",
  "collectionId": "b6f2b2a0-2f34-4a3e-9e8e-9a1a6b8c0e11"
}
```

Ответ `200` (`CharacterItemEntity`):

```json
{
  "id": "1c2d3e4f-5678-4abc-9def-0123456789ab",
  "name": "Alice",
  "imageUrl": "https://storage.yandexcloud.net/bucket/characters/1732012345678-6d0e...-c2.png",
  "description": "A young adventurer with a red cloak, turnaround reference sheet.",
  "style": "anime",
  "collectionId": "b6f2b2a0-2f34-4a3e-9e8e-9a1a6b8c0e11",
  "createdAt": "2026-09-20T10:00:00.000Z",
  "updatedAt": "2026-09-20T10:00:00.000Z"
}
```

Если `collectionId` задан, но коллекция не найдена — `404 Not Found`. Если генерация изображения провайдером
вернула пустой ответ — `500 Internal Server Error`.

### `POST /storage/upload`

Запрос — `multipart/form-data` с полем `file` и опциональным query-параметром `prefix` (например,
`?prefix=videos/`).

Ответ `200`:

```json
{
  "message": "File uploaded successfully",
  "url": "https://storage.yandexcloud.net/bucket/images/1732012345678-photo.png",
  "key": "images/1732012345678-photo.png",
  "etag": "\"d41d8cd98f00b204e9800998ecf8427e\""
}
```

Без файла в запросе — `400 Bad Request`.

## Валидация

- Глобальный `ValidationPipe({ whitelist: true, transform: true })` включён в `main.ts`: любые поля тела
  запроса, не описанные в DTO, отбрасываются; значения приводятся к заявленным типам.
- Ограничения длины полей заданы декораторами `class-validator` прямо в DTO (см. таблицу выше:
  `@MaxLength`, `@IsNotEmpty`, `@IsOptional`).
- Enum `CharacterStyle` (`src/shared/constants/character-style.ts`): `anime`, `pixar3d`.
- Enum `GenereationItemStatus` (`src/shared/constants/generation-item.ts`, имя с сознательно сохранённой
  опечаткой): `PENDING`, `RUNNING`, `FAILED`, `COMPLETED`, `WAITING_START`.
