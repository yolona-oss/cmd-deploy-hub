import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PlatformService } from './platform.service';
import { PlatformTraiderSchema } from './schemas/traider.schema';
import { PlatformTradeSchema } from './schemas/trades.schema';
import { PlatformTargetSchema } from './schemas/target.schema';
import { PlatformController } from './platform.controller';
import { ConfigModule } from '@nestjs/config';

@Module({
    imports: [
        ConfigModule,
        MongooseModule.forFeature([
            { name: 'PlatformTraider', schema: PlatformTraiderSchema },
            { name: 'PlatformTrade', schema: PlatformTradeSchema },
            { name: 'PlatformTarget', schema: PlatformTargetSchema }
        ]),
    ],
    providers: [PlatformService],
    controllers: [PlatformController],
    exports: [PlatformService]
})
export class PlatformModule {}
