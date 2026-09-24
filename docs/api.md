# HTTP API

Глобально включён `ValidationPipe({ whitelist: true, transform: true })` — лишние поля в
теле запроса отбрасываются, DTO валидируются `class-validator`.

## `deepseek` (`src/ai-providers/deepseek`)

### `POST /deepseek/generate`

Тело: `{ prompt: string }`
Ответ: `{ message: string }`

## `xai` (`src/ai-providers/xai`)

### `POST /xai/text/generate`

Тело: `{ prompt: string }`
Ответ: `{ message: string }`

### `POST /xai/image/generate`

Тело:
```
{
  prompt: string,          // <= 100000 символов
  referenceImages?: string[],
  aspectRatio?: "W:H"       // например "16:9"
}
```
Ответ: `{ base64: string, mediaType: string }`
Ошибка: `500 Image generation failed.`, если провайдер не вернул изображение.

## `character-gallery` (`src/character-gallery`)

### `POST /character-gallery/create`

Тело: `{ name: string, appearance: { ageAndGender, face, hair, build, outfit, footwear, accessories, palette }, style?: string, collectionId?: string }` — все 8 полей `appearance` обязательные непустые строки (до 1000 символов).
Если указан `collectionId` — стиль берётся из коллекции (переопределяет `style` из тела).
Ответ: `CharacterItemEntity` (одним запросом к xAI генерирует мастер-лист персонажа — 4 ракурса в полный рост и 8 эмоций, 16:9, 2k — и грузит в S3; URL в `imageUrl`).

### `POST /character-gallery/collection/create`

Тело: `{ name: string, style?: CharacterStyle }`
Ответ: `CharacterCollectionItemEntity`.

## `create-video` (`src/create-video`)

### `POST /create-video/create`

Генерирует одну сцену (картинка + видео) для существующей коллекции персонажей.

Тело:
```
{
  scenario: string,          // <= 100000 символов
  collectionId: string,
  aspectRatio?: "9:16" | "16:9" | "1:1",  // по умолчанию "9:16"
  duration?: number           // 1..15 сек, по умолчанию 5
}
```
Ответ: `{ sceneImageUrl: string, sceneVideoUrl: string }`
Результат кэшируется в Redis по `hash(scenario + collectionId)`. Требует, чтобы у
коллекции был задан `style` — иначе `400 Bad Request`; отсутствующая коллекция —
`404 Not Found`.

## `video-pipe` (`src/video-pipe`)

### `POST /video-pipe/create`

Генерирует несколько сцен единым стилем и склеивает их в один ролик.

Тело:
```
{
  scenarios: string[],       // 1 и более сценариев, одна сцена на сценарий, верхнего предела нет
  collectionId: string,
  aspectRatio?: "9:16" | "16:9" | "1:1"
}
```
Ответ: `{ videoUrl: string }`

## `media` (`src/media`)

### `POST /media/trim-to-shorts`

Кроп видео в 9:16, опционально обрезка по времени (Shorts — максимум 60 сек).

Тело: `{ inputPath: string, outputPath: string, startSec?: number, endSec?: number, durationSec?: number }`
Ответ: `{ ok: true, outputPath: string }`

### `POST /media/concat`

Склейка нескольких локальных видео (без ре-энкода, `concat` demuxer).

Тело: `{ inputPaths: string[], outputPath: string }`
Ответ: `{ ok: true, outputPath: string }`

### `POST /media/concat-and-get-url`

Скачивает видео по URL, склеивает, грузит результат в S3.

Тело: `{ inputUrls: string[] }` (валидные URL)
Ответ: `{ url: string, key: string }`

### `POST /media/concat-normalized-vertical`

Как выше, но с нормализацией всех клипов до 720×1280 через filter graph (устраняет дрейф
параметров потока между сгенерированными клипами).

Тело: `{ inputUrls: string[] }`
Ответ: `{ url: string, key: string }`

## `storage` (`src/storage`)

### `POST /storage/upload`

`multipart/form-data`, поле файла — `file`. Query: `prefix` (например `videos/`,
разрешены только `[a-z0-9/_-]`, иначе используется дефолт `images/`).

Ответ: `{ message: string, url: string, key: string, etag?: string }`
Ошибка: `400 No file uploaded.`, если файл не передан.
