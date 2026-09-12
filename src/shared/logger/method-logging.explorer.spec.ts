import { Injectable } from '@nestjs/common';
import { DiscoveryModule } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { LogMethods } from './log-methods.decorator';
import { MethodLoggingExplorer } from './method-logging.explorer';
import { AppLoggerService } from './logger.service';

@LogMethods()
@Injectable()
class DecoratedService {
  ok(value: string): Promise<string> {
    return Promise.resolve(`ok:${value}`);
  }

  fail(): Promise<never> {
    return Promise.reject(new Error('boom'));
  }
}

@Injectable()
class PlainService {
  greet(): string {
    return 'hi';
  }
}

describe('MethodLoggingExplorer', () => {
  it('wraps decorated providers and leaves undecorated providers untouched', async () => {
    const logger = {
      logMethodStart: jest.fn(),
      logMethodEnd: jest.fn(),
      logMethodError: jest.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      imports: [DiscoveryModule],
      providers: [
        AppLoggerService,
        MethodLoggingExplorer,
        DecoratedService,
        PlainService,
      ],
    })
      .overrideProvider(AppLoggerService)
      .useValue(logger)
      .compile();

    const explorer = moduleRef.get(MethodLoggingExplorer);
    explorer.onModuleInit();

    const decorated = moduleRef.get(DecoratedService);
    const plain = moduleRef.get(PlainService);

    const result = await decorated.ok('value');
    expect(result).toBe('ok:value');
    expect(logger.logMethodStart).toHaveBeenCalledWith(
      'DecoratedService',
      'ok',
      ['value'],
    );
    expect(logger.logMethodEnd).toHaveBeenCalledTimes(1);

    await expect(decorated.fail()).rejects.toThrow('boom');
    expect(logger.logMethodError).toHaveBeenCalledTimes(1);

    expect(plain.greet()).toBe('hi');
    expect(logger.logMethodStart).not.toHaveBeenCalledWith(
      'PlainService',
      'greet',
      expect.anything(),
    );

    await moduleRef.close();
  });
});
