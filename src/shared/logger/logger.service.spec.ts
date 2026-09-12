import { AppLoggerService } from './logger.service';

describe('AppLoggerService', () => {
  let logger: AppLoggerService;

  beforeEach(() => {
    logger = new AppLoggerService();
    jest.spyOn(logger, 'log').mockImplementation(() => undefined);
    jest.spyOn(logger, 'error').mockImplementation(() => undefined);
  });

  describe('trackExternalCall', () => {
    it('logs external.request and external.response and returns the result', async () => {
      const fn = jest.fn().mockResolvedValue('ok');

      const result = await logger.trackExternalCall(
        {
          provider: 'deepseek',
          operation: 'generateText',
          request: { prompt: 'hi' },
        },
        fn,
      );

      expect(result).toBe('ok');
      expect(fn).toHaveBeenCalledTimes(1);

      const loggedEvents = (logger.log as jest.Mock).mock.calls.map((call) =>
        JSON.stringify(call),
      );
      expect(loggedEvents.some((c) => c.includes('external.request'))).toBe(
        true,
      );
      expect(loggedEvents.some((c) => c.includes('external.response'))).toBe(
        true,
      );
    });

    it('logs external.error and rejects with the same error when fn rejects', async () => {
      const originalError = new Error('boom');
      const fn = jest.fn().mockRejectedValue(originalError);

      await expect(
        logger.trackExternalCall(
          { provider: 'deepseek', operation: 'generateText', request: {} },
          fn,
        ),
      ).rejects.toBe(originalError);

      const loggedEvents = (logger.error as jest.Mock).mock.calls.map((call) =>
        JSON.stringify(call),
      );
      expect(loggedEvents.some((c) => c.includes('external.error'))).toBe(true);
    });

    it('does not leak secret keys from request into the logged output', async () => {
      const fn = jest.fn().mockResolvedValue('ok');

      await logger.trackExternalCall(
        {
          provider: 'deepseek',
          operation: 'generateText',
          request: { apiKey: 'super-secret-value' },
        },
        fn,
      );

      const loggedText = (logger.log as jest.Mock).mock.calls
        .map((call) => JSON.stringify(call))
        .join('\n');
      expect(loggedText).not.toContain('super-secret-value');
    });
  });
});
