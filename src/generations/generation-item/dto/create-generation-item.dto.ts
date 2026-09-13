import { IsEnum, IsOptional } from 'class-validator';
import { GenereationItemStatus } from 'src/shared/constants/generation-item';

export class CreateGenerationItemDto {
  @IsOptional()
  @IsEnum(GenereationItemStatus)
  status?: GenereationItemStatus;
}
