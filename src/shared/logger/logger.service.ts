import { ConsoleLogger, Injectable, Scope } from '@nestjs/common';
import { LOG_EVENT } from '../constants/logger';
import { LOG_PAYLOADS } from '../constants/config';
import { sanitizeForLog } from './sanitize';

export interface HttpRequestLogMeta {
  method: string;
  url: string;
  controller: string;
  handler: string;
  body?: unknown;
  params?: unknown;
  query?: unknown;
}

export interface HttpResponseLogMeta {
  method: string;
  url: string;
  controller: string;
  handler: string;
  statusCode: number;
  durationMs: number;
}

export interface ExternalCallMeta {
  provider: string;
  operation: string;
  request?: unknown;
}

@Injectable({ scope: Scope.TRANSIENT })
export class AppLoggerService extends ConsoleLogger {
  private payload(value: unknown): unknown {
    if (!LOG_PAYLOADS) {
      return undefined;
    }
    return sanitizeForLog(value);
  }

  logHttpRequest(meta: HttpRequestLogMeta): void {
    this.log({
      event: LOG_EVENT.HTTP_REQUEST,
      context: meta.controller,
      method: meta.method,
      url: meta.url,
      handler: meta.handler,
      body: this.payload(meta.body),
      params: this.payload(meta.params),
      query: this.payload(meta.query),
    });
  }

  logHttpResponse(meta: HttpResponseLogMeta): void {
    this.log({
      event: LOG_EVENT.HTTP_RESPONSE,
      context: meta.controller,
      method: meta.method,
      url: meta.url,
      handler: meta.handler,
      statusCode: meta.statusCode,
      durationMs: meta.durationMs,
    });
  }

  logMethodStart(context: string, method: string, args: unknown[]): void {
    this.debug({
      event: LOG_EVENT.METHOD_START,
      context,
      method,
      args: this.payload(args),
    });
  }

  logMethodEnd(
    context: string,
    method: string,
    result: unknown,
    durationMs: number,
  ): void {
    this.debug({
      event: LOG_EVENT.METHOD_END,
      context,
      method,
      result: this.payload(result),
      durationMs,
    });
  }

  logMethodError(
    context: string,
    method: string,
    error: unknown,
    durationMs: number,
  ): void {
    this.error({
      event: LOG_EVENT.METHOD_ERROR,
      context,
      method,
      error: sanitizeForLog(error),
      durationMs,
    });
  }

  async trackExternalCall<T>(
    meta: ExternalCallMeta,
    fn: () => Promise<T>,
    summarize?: (result: T) => Record<string, unknown>,
  ): Promise<T> {
    const { provider, operation, request } = meta;
    const startedAt = Date.now();

    this.log({
      event: LOG_EVENT.EXTERNAL_REQUEST,
      context: provider,
      provider,
      operation,
      request: this.payload(request),
    });

    try {
      const result = await fn();
      const durationMs = Date.now() - startedAt;
      this.log({
        event: LOG_EVENT.EXTERNAL_RESPONSE,
        context: provider,
        provider,
        operation,
        durationMs,
        response: summarize ? this.payload(summarize(result)) : undefined,
      });
      return result;
    } catch (error) {
      const durationMs = Date.now() - startedAt;
      this.error({
        event: LOG_EVENT.EXTERNAL_ERROR,
        context: provider,
        provider,
        operation,
        durationMs,
        error: sanitizeForLog(error),
      });
      throw error;
    }
  }
}
