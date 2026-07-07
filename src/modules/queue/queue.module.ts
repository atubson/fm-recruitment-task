import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';

@Module({
    imports: [
        BullModule.forRootAsync({
            useFactory: (config: ConfigService) => ({
                connection: {
                    host: config.getOrThrow<string>('redis.host'),
                    port: config.getOrThrow<number>('redis.port'),
                },
            }),
            inject: [ConfigService],
        }),
    ],
    exports: [BullModule],
})
export class QueueModule {}
