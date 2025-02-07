import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import AppConfig from './common/config/configuration'

import { PlatformModule } from './platform/platform.module';
import { CommonModule } from './common/common.module';

@Module({
    imports: [
        CommonModule,
        PlatformModule,

        ConfigModule.forRoot({
            load: [AppConfig],
            isGlobal: true,
            cache: true
        }),
    ],
    providers: [
    ],
})
export class AppModule { }
