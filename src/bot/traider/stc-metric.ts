import { Trade } from "./types"
import { IBaseTradeTarget } from "./types/trade-target"

export interface ISTCMetrics<TradeTarget extends IBaseTradeTarget = IBaseTradeTarget, PlatformResData = never> {
    Trades: Array<Trade<TradeTarget, PlatformResData>&{exec_time: number}>,
    SuccessTrades: Array<Trade<TradeTarget, PlatformResData>&{exec_time: number}>,
    SellTrades: Array<Trade<TradeTarget, PlatformResData>&{exec_time: number}>,
    BuyTrades: Array<Trade<TradeTarget, PlatformResData>&{exec_time: number}>,
    ErrorTrades: Array<Trade<TradeTarget, PlatformResData>&{exec_time: number}>,
    ErrorRate: number,
    BuyMeanPrice: number,
    SellMeanPrice: number,
    TotalBuyVolume: number,
    TotalSellVolume: number,
    TotalBuyVolumePrice: number,
    TotalSellVolumePrice: number,
    DropedTradesCount: number,
}

// TODO: remove trades array and save data exacly in the metrics
export class STCMetrics<TradeTarget extends IBaseTradeTarget = IBaseTradeTarget, PlatformResData = any> {
    protected trades: Array<Trade<TradeTarget, PlatformResData>&{exec_time: number}> = []
    protected droped = 0

    public reset() {
        this.trades = []
    }

    public addTrade(trade: Trade<TradeTarget, PlatformResData>&{exec_time: number}) {
        this.trades.push(trade)
    }

    public Trades() {
        return this.trades
    }

    public SuccessTrades() {
        return this.trades.filter(t => t.result.success)
    }

    public SellTrades(successonly = true) {
        return this.trades.filter(t => t.side === "SELL" && (!successonly || t.result.success))
    }

    public BuyTrades(successonly = true) {
        return this.trades.filter(t => t.side === "BUY" && (!successonly || t.result.success))
    }

    public ErrorTrades() {
        return this.trades.filter(t => !t.result.success)
    }

    public ErrorRate() {
        return this.ErrorTrades().length / this.trades.length
    }

    public BuyMeanPrice(): number {
        return this.BuyTrades(true)
            .reduce((acc: number, trade) => acc + trade.value.price, 0) / this.BuyTrades().length
    }

    public SellMeanPrice(): number {
        return this.SellTrades(true)
            .reduce((acc: number, trade) => acc + trade.value.price, 0) / this.SellTrades().length
    }

    public TotalBuyVolume(): number {
        return this.BuyTrades(true)
            .reduce((acc: number, trade) => acc + trade.value.quantity, 0)
    }

    public TotalSellVolume(): number {
        return this.SellTrades(true)
            .reduce((acc: number, trade) => acc + trade.value.quantity, 0)
    }

    public TotalBuyVolumePrice(): number {
        return this.BuyMeanPrice() * this.TotalBuyVolume()
    }

    public TotalSellVolumePrice(): number {
        return this.SellMeanPrice() * this.TotalSellVolume()
    }

    public increaseDroped(i: number = 1) {
        this.droped += i
    }

    public agregate(): ISTCMetrics<TradeTarget, PlatformResData> {
        return {
            Trades: this.trades,
            SuccessTrades: this.SuccessTrades(),
            SellTrades: this.SellTrades(),
            BuyTrades: this.BuyTrades(),
            ErrorTrades: this.ErrorTrades(),
            ErrorRate: this.ErrorRate(),
            BuyMeanPrice: this.BuyMeanPrice(),
            SellMeanPrice: this.SellMeanPrice(),
            TotalBuyVolume: this.TotalBuyVolume(),
            TotalSellVolume: this.TotalSellVolume(),
            TotalBuyVolumePrice: this.TotalBuyVolumePrice(),
            TotalSellVolumePrice: this.TotalSellVolumePrice(),
            DropedTradesCount: this.droped,
        }
    }
}
