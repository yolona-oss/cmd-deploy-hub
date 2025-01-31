import { ISTCMetrics, SlaveTraderCtrl } from "bot/traider/stc";
import { IRunnable } from "types/runnable";
import { AbstractState } from "types/state";
import { BaseTradeApi } from "./trade-api/base-trade-api";
import { ExCurveNodeList, ExCurveFullNode } from "./types/ex-curve";
import { LinkedList } from "utils/struct/linked-list";
import { Trade } from "./types";
import { isExDateInRange } from "./types/time-range";
import { BotDrivenCurve } from "./bot-driven-curve";
import { Identificable } from "types/identificable";
import log from "utils/logger";

export abstract class MTCContext {
    constructor(
        private state: MTCState
    )
    { }

    public transitionTo(state: MTCState) {
        this.state = state
        this.state.setContext(this)
    }

    public setForceStopSlaves(forceStopSlaves: boolean) {
        this.state.setForceStopSlaves(forceStopSlaves)
    }

    public async stopSlave(slave: SlaveTraderCtrl<any, any, any>) {
        await slave.stop(this.state.isForceStop())
    }
}

export abstract class MTCState extends AbstractState<MTCContext> {
    private forceStopSlaves: boolean = false

    setForceStopSlaves(forceStopSlaves: boolean) {
        this.forceStopSlaves = forceStopSlaves
    }

    isForceStop() {
        return this.forceStopSlaves
    }
}

type LoopFnType<
        TradeApi extends BaseTradeApi<WalletType, TxResType>,
        WalletType extends object,
    TxResType> =
        (this: MasterTraderCtrl<TradeApi, WalletType, TxResType>, slave: SlaveTraderCtrl<TradeApi, WalletType, TxResType>[]) => Promise<void>

export abstract class MasterTraderCtrl<
        TradeApi extends BaseTradeApi<
                                WalletType, TxResType
                            >,
        WalletType extends object,
        TxResType
    >
    implements IRunnable, Identificable
{
    private _isRunning: boolean = false
    protected loopFn: LoopFnType<TradeApi, WalletType, TxResType>

    protected botDrivenCurve
    private curve_id

    private static flag: boolean = true

    constructor(
        public readonly target: string,
        protected slaves: Array<SlaveTraderCtrl<TradeApi, WalletType, TxResType>>,
        protected tradeApi: TradeApi,
        protected ctx: MTCContext,
        public readonly id: string = "mtc_main"
    ) {
        MasterTraderCtrl.flag = true

        for (const s of this.slaves) {
            if (!s.isInitialized()) {
                throw new Error("MasterTraderCtrl::constructor() slave not initialized!")
            }
            s.onsell = (trade: Trade<TxResType>) => this.onSell(trade)
            s.onbuy = (trade: Trade<TxResType>) => this.onBuy(trade)
        }

        this.curve_id = `Id${this.id}_Api${this.tradeApi.id}_Target{this.target}_curve`
        this.botDrivenCurve = BotDrivenCurve.loadFromFile(this.curve_id)

        this.loopFn = async function() {
            if (MasterTraderCtrl.flag) {
                log.echo("MasterTraderCtrl::loopFn() not redefined. Using default implementation with no functionality.")
                MasterTraderCtrl.flag = false
            }
        }

    }

    public setLoopFn(loopFn: LoopFnType<TradeApi, WalletType, TxResType>) {
        this.loopFn = loopFn
    }

    //public 

    public changeState(state: MTCState) {
        this.ctx.transitionTo(state)
    }

    private onSell(trade: Trade<TxResType>) {
        this.botDrivenCurve.addTrade({
            price: trade.value.price,
            quantity: trade.value.quantity,
            side: trade.side,
            time: Date.now()
        })
    }

    private onBuy(trade: Trade<TxResType>) {
        this.botDrivenCurve.addTrade({
            price: trade.value.price,
            quantity: trade.value.quantity,
            side: trade.side,
            time: Date.now()
        })
    }

    public applyToSlaves(fn: (slave: SlaveTraderCtrl<TradeApi, WalletType, TxResType>, index: number) => void) {
        for (let i = 0; i < this.slaves.length; i++) {
            fn(this.slaves[i], i)
        }
    }

    public isRunning(): boolean {
        return this._isRunning
    }

    public async targetInfo() {
        return await this.tradeApi.TargetInfo(this.target)
    }

    public slavesCount() {
        return this.slaves.length
    }

    protected getRandomSlave(): SlaveTraderCtrl<TradeApi, WalletType, TxResType> {
        return this.slaves[Math.floor(Math.random() * this.slaves.length)]
    }

    async run() {
        this._isRunning = true

        while (this._isRunning) {
            await this.loopFn(this.slaves)
        }

        for (const slave of this.slaves) {
            await this.ctx.stopSlave(slave)
        }
    }

    async terminate() {
        this.botDrivenCurve.saveToFile(this.curve_id)
        this._isRunning = false
    }

    public agregateMetrics(slaveMetrics: Array<ISTCMetrics>,
        initial: ISTCMetrics = {
            Trades: [],
            SuccessTrades: [],
            SellTrades: [],
            BuyTrades: [],
            ErrorTrades: [],
            ErrorRate: 0,
            BuyMeanPrice: 0n,
            SellMeanPrice: 0n,
            TotalBuyVolume: 0n,
            TotalSellVolume: 0n,
            TotalBuyVolumePrice: 0n,
            TotalSellVolumePrice: 0n
        }): ISTCMetrics {
        let dmetrics: ISTCMetrics = Object.assign({}, initial)

        const concatMetrics = (src: ISTCMetrics, dst: ISTCMetrics) => {
            dst.Trades = dst.Trades.concat(src.Trades)
            dst.SuccessTrades = dst.SuccessTrades.concat(src.SuccessTrades)
            dst.SellTrades = dst.SellTrades.concat(src.SellTrades)
            dst.BuyTrades = dst.BuyTrades.concat(src.BuyTrades)
            dst.ErrorTrades = dst.ErrorTrades.concat(src.ErrorTrades)
            dst.ErrorRate = dst.ErrorRate + src.ErrorRate
            dst.BuyMeanPrice = dst.BuyMeanPrice + src.BuyMeanPrice
            dst.SellMeanPrice = dst.SellMeanPrice + src.SellMeanPrice
            dst.TotalBuyVolume = dst.TotalBuyVolume + src.TotalBuyVolume
            dst.TotalSellVolume = dst.TotalSellVolume + src.TotalSellVolume
            dst.TotalBuyVolumePrice = dst.TotalBuyVolumePrice + src.TotalBuyVolumePrice
            dst.TotalSellVolumePrice = dst.TotalSellVolumePrice + src.TotalSellVolumePrice
        }

        slaveMetrics.forEach((smetric) => {
            concatMetrics(smetric, dmetrics)
        })
        return dmetrics
    }
}
