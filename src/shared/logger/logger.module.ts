import { Global, Module } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR, DiscoveryModule } from '@nestjs/core';
import { AppLoggerService } from './logger.service';
import { LoggingInterceptor } from './logging.interceptor';
import { AllExceptionsFilter } from './all-exceptions.filter';
import { MethodLoggingExplorer } from './method-logging.explorer';

@Global()
@Module({
  imports: [DiscoveryModule],
  providers: [
    AppLoggerService,
    MethodLoggingExplorer,
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
  exports: [AppLoggerService],
})
export class LoggerModule {}
