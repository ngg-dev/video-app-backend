import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { Request, Response } from 'express';
import { AppLoggerService } from './logger.service';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(private readonly logger: AppLoggerService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const httpContext = context.switchToHttp();
    const request = httpContext.getRequest<Request>();
    const response = httpContext.getResponse<Response>();
    const controller = context.getClass().name;
    const handler = context.getHandler().name;
    const startedAt = Date.now();

    this.logger.logHttpRequest({
      method: request.method,
      url: request.url,
      controller,
      handler,
      body: request.body,
      params: request.params,
      query: request.query,
    });

    return next.handle().pipe(
      tap({
        next: () => {
          this.logger.logHttpResponse({
            method: request.method,
            url: request.url,
            controller,
            handler,
            statusCode: response.statusCode,
            durationMs: Date.now() - startedAt,
          });
        },
      }),
    );
  }
}
