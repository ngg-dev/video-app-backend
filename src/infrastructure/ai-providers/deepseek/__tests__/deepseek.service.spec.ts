import { generateText } from 'ai';
import { DeepSeekService } from '../services/deepseek.service';
import { AppLoggerService } from 'src/shared/logger/logger.service';

jest.mock('ai', () => ({
  generateText: jest.fn(),
}));

jest.mock('@ai-sdk/deepseek', () => ({
  createDeepSeek: jest.fn().mockReturnValue({
    languageModel: jest.fn().mockReturnValue('mock-model'),
  }),
}));

describe('DeepSeekService', () => {
  let service: DeepSeekService;
  let logger: AppLoggerService;

  beforeEach(() => {
    logger = new AppLoggerService();
    jest.spyOn(logger, 'log').mockImplementation(() => undefined);
    jest.spyOn(logger, 'error').mockImplementation(() => undefined);
    service = new DeepSeekService(logger);
    jest.clearAllMocks();
  });

  it('logs external.request and external.response and returns the generated text', async () => {
    (generateText as jest.Mock).mockResolvedValue({
      text: 'hello world',
      finishReason: 'stop',
      usage: { totalTokens: 10 },
    });

    const result = await service.generate({ prompt: 'say hi' });

    expect(result).toBe('hello world');

    const loggedEvents = (logger.log as jest.Mock).mock.calls.map((call) =>
      JSON.stringify(call),
    );
    expect(loggedEvents.some((c) => c.includes('external.request'))).toBe(true);
    expect(loggedEvents.some((c) => c.includes('external.response'))).toBe(
      true,
    );
  });

  it('logs external.error and rethrows when generateText rejects', async () => {
    const error = new Error('provider down');
    (generateText as jest.Mock).mockRejectedValue(error);

    await expect(service.generate({ prompt: 'say hi' })).rejects.toBe(error);

    const loggedEvents = (logger.error as jest.Mock).mock.calls.map((call) =>
      JSON.stringify(call),
    );
    expect(loggedEvents.some((c) => c.includes('external.error'))).toBe(true);
  });
});
