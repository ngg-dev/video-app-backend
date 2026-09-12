import { IsEnum, IsOptional } from 'class-validator';
import { GenereationItemStatus } from '../../../shared/constants/generation-item';

export class CreateGenerationItemDto {
  @IsOptional()
  @IsEnum(GenereationItemStatus)
  status?: GenereationItemStatus;
}
