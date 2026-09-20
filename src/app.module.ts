import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DeepSeekModule } from './ai-providers/deepseek/deepseek.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { GenerationItemModule } from './generations/generation-item/generation-item.module';
import { RedisModule } from './database/redis/redis.module';
import { XaiModule } from './ai-providers/xai/xai.module';
import { CreateVideoModule } from './create-video/create-video.module';
import { LoggerModule } from './shared/logger/logger.module';
import { CharacterGalleryModule } from './character-gallery/character-gallery.module';
import { StorageModule } from './storage/storage.module';
import { VideoPipeModule } from './video-pipe/video-pipe.module';

@Module({
  imports: [
    LoggerModule,
    ConfigModule.forRoot({
      isGlobal: true, // Makes the ConfigService available across all your modules
    }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DATABASE_HOST,
      port: Number(process.env.DATABASE_PORT),
      username: process.env.DATABASE_USER,
      password: process.env.DATABASE_PASSWORD,
      database: process.env.DATABASE_NAME,
      autoLoadEntities: true,
      synchronize: process.env.NODE_ENV !== 'production',
      verboseRetryLog: true,
    }),
    DeepSeekModule,
    GenerationItemModule,
    RedisModule,
    XaiModule,
    CreateVideoModule,
    CharacterGalleryModule,
    StorageModule,
    VideoPipeModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
