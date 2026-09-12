import { Controller, Get, Injectable, Module } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { LoggerModule } from './logger.module';
import { LogMethods } from './log-methods.decorator';
import { AppLoggerService } from './logger.service';

@LogMethods()
@Injectable()
class TestService {
  ok(): Promise<string> {
    return Promise.resolve('ok');
  }

  explode(): Promise<never> {
    return Promise.reject(new Error('kaboom'));
  }
}

@Controller('test')
class TestController {
  constructor(private readonly testService: TestService) {}

  @Get('ok')
  async ok() {
    return this.testService.ok();
  }

  @Get('fail')
  async fail() {
    return this.testService.explode();
  }
}

@Module({
  imports: [LoggerModule],
  controllers: [TestController],
  providers: [TestService],
})
class TestAppModule {}

describe('Logging (integration)', () => {
  let app: INestApplication;
  let logSpy: jest.SpyInstance;
  let debugSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [TestAppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();

    const logger = await app.resolve(AppLoggerService);
    logSpy = jest.spyOn(AppLoggerService.prototype, 'log');
    debugSpy = jest.spyOn(AppLoggerService.prototype, 'debug');
    errorSpy = jest.spyOn(AppLoggerService.prototype, 'error');
    void logger;
  });

  afterEach(() => {
    logSpy.mockClear();
    debugSpy.mockClear();
    errorSpy.mockClear();
  });

  afterAll(async () => {
    logSpy.mockRestore();
    debugSpy.mockRestore();
    errorSpy.mockRestore();
    await app.close();
  });

  function loggedEvents(spy: jest.SpyInstance): string[] {
    return spy.mock.calls.map((call) => JSON.stringify(call));
  }

  it('logs http.request, method.start, method.end and http.response for a successful call', async () => {
    const response = await request(app.getHttpServer()).get('/test/ok');

    expect(response.status).toBe(200);

    const logged = loggedEvents(logSpy);
    const debugged = loggedEvents(debugSpy);

    expect(logged.some((c) => c.includes('http.request'))).toBe(true);
    expect(logged.some((c) => c.includes('http.response'))).toBe(true);
    expect(debugged.some((c) => c.includes('method.start'))).toBe(true);
    expect(debugged.some((c) => c.includes('method.end'))).toBe(true);
  });

  it('logs method.error and the filter error, returning 500 with the expected JSON body', async () => {
    const response = await request(app.getHttpServer()).get('/test/fail');

    expect(response.status).toBe(500);
    expect(response.body).toEqual(
      expect.objectContaining({
        statusCode: 500,
        path: '/test/fail',
      }),
    );

    const errored = loggedEvents(errorSpy);
    expect(errored.some((c) => c.includes('method.error'))).toBe(true);
  });
});
