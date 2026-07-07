import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './modules/database/database.module';
import { appConfig, databaseConfig, redisConfig, s3Config, uploadConfig } from './config';
import { ImageModule } from './modules/image/image.module';
import { QueueModule } from './modules/queue/queue.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [databaseConfig, appConfig, redisConfig, s3Config, uploadConfig],
      isGlobal: true,
    }),
    DatabaseModule,
    QueueModule,
    ImageModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
