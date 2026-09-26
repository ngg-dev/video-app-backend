import { RUNWARE_TRANSPORT } from 'src/shared/constants/runware';
import { RunwareClient, RunwareSdkModule } from './types/runware.types';

export async function createRunwareClient(
  apiKey: string,
): Promise<RunwareClient> {
  const sdk = (await import('@runware/sdk')) as unknown as RunwareSdkModule;
  return sdk.createClient({ apiKey, transport: RUNWARE_TRANSPORT });
}
