import { ITradeCommit } from "./types/trade"
import { IBaseTradeAsset } from "./types/asset"
import { WithExecTime } from "types/with-exec-time"

export interface ISTCMetrics<TradeAsset extends IBaseTradeAsset = IBaseTradeAsset, PlatformResData = never> {
    Trades: Array<ITradeCommit<TradeAsset, PlatformResData>&WithExecTime>,
    SuccessTrades: Array<ITradeCommit<TradeAsset, PlatformResData>&WithExecTime>,
    SellTrades: Array<ITradeCommit<TradeAsset, PlatformResData>&WithExecTime>,
    BuyTrades: Array<ITradeCommit<TradeAsset, PlatformResData>&WithExecTime>,
    ErrorTrades: Array<ITradeCommit<TradeAsset, PlatformResData>&WithExecTime>,
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
export class STCMetrics<TradeAsset extends IBaseTradeAsset = IBaseTradeAsset, PlatformResData = any> {
    protected trades: Array<ITradeCommit<TradeAsset, PlatformResData>&WithExecTime> = []
    protected droped = 0

    public reset() {
        this.trades = []
    }

    public addTrade(trade: ITradeCommit<TradeAsset, PlatformResData>&WithExecTime) {
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

    public agregate(): ISTCMetrics<TradeAsset, PlatformResData> {
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
