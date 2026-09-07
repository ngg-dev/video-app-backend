# --- Этап 1: Сборка приложения ---
FROM node:20-alpine AS builder
WORKDIR /app

# Копируем файлы зависимостей
COPY package*.json ./

# Устанавливаем ВСЕ зависимости, включая devDependencies (они нужны для nest build)
RUN npm ci

# Копируем исходный код проекта
COPY . .

# Компилируем TypeScript в JavaScript (создается папка dist/)
RUN npm run build

# --- Этап 2: Финальный образ для запуска ---
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# Копируем package.json
COPY package*.json ./

# Устанавливаем ТОЛЬКО production-зависимости (без тяжелых библиотек тестирования и линтеров)
RUN npm ci --only=production

# Забираем скомпилированный код из первого этапа
COPY --from=builder /app/dist ./dist

# Открываем стандартный порт NestJS
EXPOSE 3000

# Запускаем приложение через ваш скрипт start:prod (node dist/main)
CMD ["npm", "run", "start:prod"]
