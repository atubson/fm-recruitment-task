import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Image } from '../image/entities/image.entity';

@Module({
    imports: [
        TypeOrmModule.forRootAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (configService: ConfigService) => ({
                type: 'postgres',
                host: configService.get<string>('database.host'),
                port: Number(configService.get<number>('database.port')),
                username: configService.get<string>('database.user'),
                password: configService.get<string>('database.password'),
                database: configService.get<string>('database.database'),
                autoLoadEntities: true,
                synchronize: false,
                entities: [Image],
            }),
        }),
    ],
})
export class DatabaseModule {}
