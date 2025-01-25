import { BaseStrategy } from "bot/traider/strategy/base-strategy";

import log from 'utils/logger'

export class RSIOverboughtOversoldStrategy extends BaseStrategy {
    async execute(): Promise<void> {
        const symbol = "BTCUSDT";
        const data = await this.platform.getMarketData(symbol);

        const price = parseFloat(data.price);
        log.echo(`Current price of ${symbol}: $${price}`);

        // Assuming some logic to compute RSI here...
        const rsi = 30;

        if (rsi < 30) {
            log.echo("RSI indicates oversold. Placing a BUY order...");
            await this.platform.placeOrder({ symbol, price, quantity: 0.01, side: "BUY" });
        } else if (rsi > 70) {
            log.echo("RSI indicates overbought. Placing a SELL order...");
            await this.platform.placeOrder({ symbol, price, quantity: 0.01, side: "SELL" });
        }
    }
}
