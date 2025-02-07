import { SlaveTraderCtrl } from "bot/traider/stc";
import { ISTCMetrics } from "./stc-metric";
import { IRunnable } from "types/runnable";
import { AbstractState } from "types/state";
import { BaseTradeApi } from "./trade-api/base-trade-api";
import { Trade } from "./types";
import { BotDrivenCurve } from "./bot-driven-curve";
import { Identificable } from "types/identificable";
import log from "utils/logger";
import { sleep } from "utils/time";
import { IClonable } from "types/clonable";
import { IBaseTradeTarget } from "./types/trade-target";

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
        TradeApi extends BaseTradeApi<TargetType, ExPlatformRes> = BaseTradeApi<any, any>,
        TargetType extends IBaseTradeTarget = IBaseTradeTarget,
        ExPlatformRes = any
> = (this: MasterTraderCtrl<TradeApi, TargetType, ExPlatformRes>, slave: SlaveTraderCtrl<TradeApi, TargetType, ExPlatformRes>[]) => Promise<void>

export abstract class MasterTraderCtrl<
        TradeApi extends BaseTradeApi<TargetType, ExPlatformRes> = any & BaseTradeApi,
        TargetType extends IBaseTradeTarget = IBaseTradeTarget,
        ExPlatformRes = any
    >
    implements
        IRunnable,
        Identificable,
        IClonable
{
    private _isRunning: boolean = false
    protected loopFn: LoopFnType<TradeApi, TargetType, ExPlatformRes>

    protected botDrivenCurve
    private curve_id

    private static flag: boolean = true

    constructor(
        public readonly target: TargetType,
        protected slaves: Array<SlaveTraderCtrl<TradeApi, TargetType, ExPlatformRes>>,
        protected tradeApi: TradeApi,
        protected ctx: MTCContext,
        public readonly id: string = "mtc_main"
    ) {
        MasterTraderCtrl.flag = true

        for (const s of this.slaves) {
            if (!s.isInitialized()) {
                throw new Error("MasterTraderCtrl::constructor() slave not initialized!")
            }
            s.onsell = (trade: Trade<TargetType, ExPlatformRes>) => this.onSell(trade)
            s.onbuy = (trade: Trade<TargetType, ExPlatformRes>) => this.onBuy(trade)
        }

        this.curve_id = `Id${this.id}_Api${this.tradeApi.id}_Target${this.target.market_id}_curve`
        this.botDrivenCurve = BotDrivenCurve.loadFromFile(this.curve_id)

        this.loopFn = async function() {
            if (MasterTraderCtrl.flag) {
                log.echo("MasterTraderCtrl::loopFn() not redefined. Using default implementation with no functionality.")
                MasterTraderCtrl.flag = false
            }
        }

    }

    abstract clone(): MasterTraderCtrl<TradeApi, TargetType, ExPlatformRes>

    public setLoopFn(loopFn: LoopFnType<TradeApi, TargetType, ExPlatformRes>) {
        this.loopFn = loopFn
    }

    public changeState(state: MTCState) {
        this.ctx.transitionTo(state)
    }

    private onSell(trade: Trade<TargetType, ExPlatformRes>) {
        this.botDrivenCurve.addTrade({
            price: trade.value.price,
            quantity: trade.value.quantity,
            side: trade.side,
            time: Date.now()
        })
    }

    private onBuy(trade: Trade<TargetType, ExPlatformRes>) {
        this.botDrivenCurve.addTrade({
            price: trade.value.price,
            quantity: trade.value.quantity,
            side: trade.side,
            time: Date.now()
        })
    }

    addSlave(slave: SlaveTraderCtrl<TradeApi, TargetType,  ExPlatformRes>) {
        slave.onsell = (trade: Trade<TargetType, ExPlatformRes>) => this.onSell(trade)
        slave.onbuy = (trade: Trade<TargetType, ExPlatformRes>) => this.onBuy(trade)
        this.slaves.push(slave)
    }

    /**
    * Filter slaves and assign to this.slaves
    * Returns removed and kept slaves
    */
    async filterSlaves(fn: (slave: SlaveTraderCtrl<TradeApi, TargetType, ExPlatformRes>) => Promise<boolean>): Promise<{
        removed: Array<SlaveTraderCtrl<TradeApi, TargetType, ExPlatformRes>>,
        kept: Array<SlaveTraderCtrl<TradeApi, TargetType, ExPlatformRes>>
    }> {
        let removed = []
        let kept = []
        for (const slave of this.slaves) {
            if (await fn(slave)) {
                kept.push(slave)
            } else {
                removed.push(slave)
            }
        }

        this.slaves = kept

        return {
            removed: removed,
            kept: kept
        }
    }

    removeSlave(slave: SlaveTraderCtrl<TradeApi, TargetType, ExPlatformRes>) {
        slave.onsell = () => {}
        slave.onbuy = () => {}
        this.slaves.splice(this.slaves.indexOf(slave), 1)
    }

    public async applyToSlaves(fn: (slave: SlaveTraderCtrl<TradeApi, TargetType, ExPlatformRes>, index: number) => Promise<void>) {
        for (let i = 0; i < this.slaves.length; i++) {
            await fn(this.slaves[i], i)
        }
    }

    public isRunning(): boolean {
        return this._isRunning
    }

    public async targetInfo() {
        return await this.tradeApi.targetInfo(this.target)
    }

    public slavesCount() {
        return this.slaves.length
    }

    protected getRandomSlave(): SlaveTraderCtrl<TradeApi, TargetType, ExPlatformRes> {
        return this.slaves[Math.floor(Math.random() * this.slaves.length)]
    }

    async run() {
        this._isRunning = true

        while (this._isRunning) {
            await sleep(1000)
        }

        for (const slave of this.slaves) {
            await this.ctx.stopSlave(slave)
        }
    }

    async terminate() {
        this.botDrivenCurve.saveToFile(this.curve_id)
        //for (const slave of this.slaves) {
        //    await this.ctx.stopSlave(slave)
        //}
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
            BuyMeanPrice: 0,
            SellMeanPrice: 0,
            TotalBuyVolume: 0,
            TotalSellVolume: 0,
            TotalBuyVolumePrice: 0,
            TotalSellVolumePrice: 0,
            DropedTradesCount: 0
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
