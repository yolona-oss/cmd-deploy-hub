import {
    Controller,
    Get,
    Post,
    Param,
    Body,
    BadRequestException
} from '@nestjs/common';
import { PlatformService } from './platform.service';
import { TradeOffer } from './types';

@Controller('platform')
export class PlatformController {
    constructor(
        private readonly service: PlatformService
    ) { }

    @Get('targets')
    async getTargets() {
        return await this.service.getTargets()
    }

    @Get('target-info/:target')
    async getTargetInfo(@Param('target') target: string) {
        return await this.service.getTargetInfo(target)
    }

    @Get('traiders')
    async getTraiders() {
        return await this.service.getTraiders()
    }

    @Get('traider-targets/:wallet')
    async getTraiderTargets(@Param('wallet') publicKey: string) {
        return await this.service.getTraiderTargets({publicKey})
    }

    @Get('traider-balance/:wallet')
    async getTraiderBalance(@Param('wallet') wallet: string) {
        return await this.service.getTraiderBalance({publicKey: wallet})
    }

    @Get('traider-commited-trades/:wallet')
    async getTraiderCommitedTrades(@Param('wallet') wallet: { publicKey: string }) {
        return await this.service.getTraderCommitedTrades(wallet)
    }

    @Get('traider-waiting-trades/:wallet')
    async getTraiderWaitingTraides(@Param('wallet') wallet: { publicKey: string }) {
        return await this.service.getTraiderWaitingTraides(wallet)
    }

    @Get('target-uncommited-trades/:target')
    async (@Param('target') target: string) {
        return this.service.uncommitedTradesOverTarget(target)
    }

    @Get('target-holders/:target')
    async getTargetHolders(@Param('target') target: string) {
        return await this.service.getTargetHolders(target)
    }

    @Get('target-price/:target')
    async getTargetPrice(@Param('target') target: string) {
        return await this.service.getTargetPrice(target)
    }

    @Get('trades-over-target/:target')
    async tradesOverTarget(@Param('target') target: string) {
        return await this.service.tradesOverTarget(target)
    }

    @Post('place-buy')
    async placeBuy(@Body() trade: TradeOffer) {
        return await this.service.placeBuy(trade)
    }

    @Post('place-sell')
    async placeSell(@Body() trade: TradeOffer) {
        return await this.service.placeSell(trade)
    }

    @Post('create-target')
    async createTarget(@Body() target: { market_id: string, mint: string, symbol: string, supply: number, initialPrice: number }) {
        return await this.service.createTarget(target.market_id, target.mint, target.symbol, target.supply, target.initialPrice)
    }

    @Post('remove-target')
    async removeTarget(@Body() target: { market_id: string }) {
        return await this.service.removeTarget(target.market_id)
    }

    @Post('create-traider')
    async createTraider(@Body() traider: { wallet: { publicKey: string } }) {
        return await this.service.createTraider(traider.wallet)
    }

    @Post('dev-update-balance')
    async updateBalance(@Body() balance: { dst: { publicKey: string }, amount: number }) {
        if (typeof balance.amount !== "number") {
            throw new BadRequestException("Amount must be number")
        }
        return await this.service.addBalance(balance.dst, balance.amount)
    }

    @Get('drop-all')
    async dropAll() {
        return await this.service.dropAll()
    }

    @Get('tmp')
    async tmp() {
        return await this.service.tmp()
    }
}
