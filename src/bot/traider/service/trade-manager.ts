import { BasePlatform } from 'bot/traider/platform/base-platform'
import { BaseStrategy } from 'bot/traider/strategy/base-strategy'

import log from 'utils/logger'

export class TradeManager {
    private platform: BasePlatform;
    private strategy: BaseStrategy;

    constructor(platform: BasePlatform, strategy: BaseStrategy) {
        this.platform = platform;
        this.strategy = strategy;
    }

    async start(): Promise<void> {
        log.echo("Starting trading bot...");
        await this.strategy.execute();
    }
}
