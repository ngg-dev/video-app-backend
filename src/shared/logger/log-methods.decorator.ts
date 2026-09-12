import { SetMetadata } from '@nestjs/common';

export const LOG_METHODS_METADATA = 'LOG_METHODS_METADATA';

export const LogMethods = (): ClassDecorator =>
  SetMetadata(LOG_METHODS_METADATA, true);
