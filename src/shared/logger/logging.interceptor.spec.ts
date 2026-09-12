import { of, throwError, firstValueFrom } from 'rxjs';
import { CallHandler, ExecutionContext } from '@nestjs/common';
import { LoggingInterceptor } from './logging.interceptor';
import { AppLoggerService } from './logger.service';

function createContext(
  overrides: Partial<{
    method: string;
    url: string;
    body: unknown;
    params: unknown;
    query: unknown;
  }> = {},
) {
  const request = {
    method: overrides.method ?? 'GET',
    url: overrides.url ?? '/things',
    body: overrides.body ?? {},
    params: overrides.params ?? {},
    query: overrides.query ?? {},
  };
  const response = { statusCode: 200 };

  const context = {
    getType: () => 'http',
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => response,
    }),
    getClass: () => ({ name: 'ThingsController' }),
    getHandler: () => ({ name: 'getThings' }),
  } as unknown as ExecutionContext;

  return context;
}

describe('LoggingInterceptor', () => {
  let logger: AppLoggerService;
  let interceptor: LoggingInterceptor;
  let logHttpRequestSpy: jest.SpyInstance;
  let logHttpResponseSpy: jest.SpyInstance;

  beforeEach(() => {
    logger = new AppLoggerService();
    logHttpRequestSpy = jest
      .spyOn(logger, 'logHttpRequest')
      .mockImplementation(() => undefined);
    logHttpResponseSpy = jest
      .spyOn(logger, 'logHttpResponse')
      .mockImplementation(() => undefined);
    interceptor = new LoggingInterceptor(logger);
  });

  it('logs http.request and http.response and does not change the emitted value', async () => {
    const context = createContext();
    const handler: CallHandler = { handle: () => of({ hello: 'world' }) };

    const result = await firstValueFrom(
      interceptor.intercept(context, handler),
    );

    expect(result).toEqual({ hello: 'world' });
    expect(logHttpRequestSpy).toHaveBeenCalledTimes(1);
    expect(logHttpResponseSpy).toHaveBeenCalledTimes(1);
  });

  it('logs the request but not a response, and rethrows on error', async () => {
    const context = createContext();
    const error = new Error('failure');
    const handler: CallHandler = { handle: () => throwError(() => error) };

    await expect(
      firstValueFrom(interceptor.intercept(context, handler)),
    ).rejects.toBe(error);

    expect(logHttpRequestSpy).toHaveBeenCalledTimes(1);
    expect(logHttpResponseSpy).not.toHaveBeenCalled();
  });

  it('skips non-http contexts', async () => {
    const context = {
      getType: () => 'rpc',
    } as unknown as ExecutionContext;
    const handler: CallHandler = { handle: () => of('value') };

    const result = await firstValueFrom(
      interceptor.intercept(context, handler),
    );

    expect(result).toBe('value');
    expect(logHttpRequestSpy).not.toHaveBeenCalled();
  });
});
