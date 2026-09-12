import {
  ArgumentsHost,
  BadRequestException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { AllExceptionsFilter } from './all-exceptions.filter';
import { AppLoggerService } from './logger.service';

function createHost(url = '/things') {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  const response = { status };
  const host = {
    switchToHttp: () => ({
      getResponse: () => response,
      getRequest: () => ({ url }),
    }),
  } as unknown as ArgumentsHost;

  return { host, status, json };
}

describe('AllExceptionsFilter', () => {
  let logger: AppLoggerService;
  let filter: AllExceptionsFilter;
  let warnSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;

  beforeEach(() => {
    logger = new AppLoggerService();
    warnSpy = jest.spyOn(logger, 'warn').mockImplementation(() => undefined);
    errorSpy = jest.spyOn(logger, 'error').mockImplementation(() => undefined);
    filter = new AllExceptionsFilter(logger);
  });

  it('logs a warning and returns the exception status for HttpException', () => {
    const { host, status, json } = createHost();
    const exception = new HttpException('Bad input', HttpStatus.BAD_REQUEST);

    filter.catch(exception, host);

    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(errorSpy).not.toHaveBeenCalled();
    expect(status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Bad input',
        path: '/things',
      }),
    );
  });

  it('preserves per-field validation messages from BadRequestException', () => {
    const { host, status, json } = createHost();
    const exception = new BadRequestException([
      'name must be a string',
      'age must be a number',
    ]);

    filter.catch(exception, host);

    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.BAD_REQUEST,
        message: ['name must be a string', 'age must be a number'],
        path: '/things',
      }),
    );
  });

  it('logs an error with stack and returns 500 for a generic Error', () => {
    const { host, status, json } = createHost();
    const exception = new Error('unexpected');

    filter.catch(exception, host);

    expect(errorSpy).toHaveBeenCalledTimes(1);
    expect(status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        path: '/things',
      }),
    );
  });
});
