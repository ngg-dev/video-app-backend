import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { AppLoggerService } from './logger.service';

interface ErrorResponseBody {
  statusCode: number;
  message: string;
  path: string;
  timestamp: string;
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(private readonly logger: AppLoggerService) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const httpContext = host.switchToHttp();
    const response = httpContext.getResponse<Response>();
    const request = httpContext.getRequest<Request>();

    const isHttpException = exception instanceof HttpException;
    const status: number = isHttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;
    const message = isHttpException
      ? exception.message
      : 'Internal server error';

    const body: ErrorResponseBody = {
      statusCode: status,
      message,
      path: request.url,
      timestamp: new Date().toISOString(),
    };

    const isServerError = status >= Number(HttpStatus.INTERNAL_SERVER_ERROR);

    if (isHttpException && !isServerError) {
      this.logger.warn({
        context: exception.constructor.name,
        statusCode: status,
        message,
        path: body.path,
      });
    } else {
      const error = exception instanceof Error ? exception : undefined;
      this.logger.error({
        context: error?.constructor.name ?? 'UnknownException',
        statusCode: status,
        message: error?.message ?? message,
        path: body.path,
        stack: error?.stack,
      });
    }

    response.status(status).json(body);
  }
}
