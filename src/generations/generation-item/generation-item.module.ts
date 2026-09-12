import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GenerationItemService } from './generation-item.service';
import { GenerationItemController } from './generation-item.controller';
import { GenerationItemEntity } from './entities/generation-item.entity';

@Module({
  imports: [TypeOrmModule.forFeature([GenerationItemEntity])],
  controllers: [GenerationItemController],
  providers: [GenerationItemService],
})
export class GenerationItemModule {}
