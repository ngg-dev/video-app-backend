import { Injectable } from '@nestjs/common';
import { LogMethods } from '../../shared/logger/log-methods.decorator';

@LogMethods()
@Injectable()
export class XaiService {
  constructor() {}
}
