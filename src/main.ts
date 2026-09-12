import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { AppLoggerService } from './shared/logger/logger.service';
import { LOG_EVENT } from './shared/constants/logger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  // AppLoggerService applies the configured LOG_LEVEL in its own
  // constructor, so every transient instance (including this one) already
  // has the right levels set.
  const logger = await app.resolve(AppLoggerService);
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
