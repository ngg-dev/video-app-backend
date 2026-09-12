import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { LogLevel, ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { AppLoggerService } from './shared/logger/logger.service';
import { LOG_EVENT, resolveLogLevels } from './shared/constants/logger';
import { LOG_LEVEL } from './shared/constants/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const logger = await app.resolve(AppLoggerService);
  logger.setLogLevels(resolveLogLevels(LOG_LEVEL as LogLevel));
  app.useLogger(logger);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  process.on('unhandledRejection', (reason) => {
    logger.error({ event: LOG_EVENT.UNHANDLED_REJECTION, reason });
  });
  process.on('uncaughtException', (error) => {
    logger.error({ event: LOG_EVENT.UNCAUGHT_EXCEPTION, error });
  });

  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
