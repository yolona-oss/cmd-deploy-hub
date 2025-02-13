import { SlaveTraderCtrl } from "bot/traider/stc";
import { ISTCMetrics } from "./stc-metric";
import { IRunnable } from "types/runnable";
import { AbstractState } from "types/state";
import { BaseTradeApi } from "./trade-api/base-trade-api";
import { ITradeCommit, IOffer } from "./types/trade";
import { BotDrivenCurve } from "./bot-driven-curve";
import { Identificable } from "types/identificable";
import log from "utils/logger";
import { sleep } from "utils/time";
import { IClonable } from "types/clonable";
import { IBaseTradeAsset } from "./types/asset";
import { TradeSideType } from "./types/trade";
import { IDEXWallet } from "./types/wallet";
import { Sequalizer } from "utils/sequalizer";

type LoopFnType<
        TradeApi extends BaseTradeApi<AssetType, ExPlatformRes> = BaseTradeApi<any, any>,
        AssetType extends IBaseTradeAsset = IBaseTradeAsset,
        ExPlatformRes = any
> = (this: MasterTraderCtrl<TradeApi, AssetType, ExPlatformRes>, slave: SlaveTraderCtrl<TradeApi, AssetType, ExPlatformRes>[]) => Promise<void>

export abstract class MasterTraderCtrl<
        TradeApi extends BaseTradeApi<AssetType, ExPlatformRes> = any & BaseTradeApi,
        AssetType extends IBaseTradeAsset = IBaseTradeAsset,
        ExPlatformRes = any
    >
    implements
        IRunnable,
        Identificable,
        IClonable
{
    private _isRunning: boolean = false
    protected loopFn: LoopFnType<TradeApi, AssetType, ExPlatformRes>
    protected sharedSequalizer: Sequalizer

    protected botDrivenCurve
    private curve_id

    private static flag: boolean = true

    constructor(
        public readonly tradeAsset: AssetType,
        protected slaves: Array<SlaveTraderCtrl<TradeApi, AssetType, ExPlatformRes>>,
        protected tradeApi: TradeApi,
        public readonly id: string = "id_mtc_main"
    ) {
        MasterTraderCtrl.flag = true
        this.sharedSequalizer = new Sequalizer()

        for (const s of this.slaves) {
            s.onsell = (trade: ITradeCommit<AssetType, ExPlatformRes>) => this.onSell(trade)
            s.onbuy = (trade: ITradeCommit<AssetType, ExPlatformRes>) => this.onBuy(trade)
            s.setSequalizer(this.sharedSequalizer)
        }

        this.curve_id = `Id${this.id}_Api${this.tradeApi.id}_Asset${this.tradeAsset.market_id}_curve`
        this.botDrivenCurve = BotDrivenCurve.loadFromFile(this.curve_id)

        this.loopFn = async function() {
            if (MasterTraderCtrl.flag) {
                //log.echo("MasterTraderCtrl::loopFn() not redefined. Using default implementation with no functionality.")
                MasterTraderCtrl.flag = false
            }
        }
    }

    public isRunning(): boolean {
        return this._isRunning
    }

    abstract clone(newId: string, newAsset: AssetType, newSlaves: SlaveTraderCtrl<TradeApi, AssetType, ExPlatformRes>[]): MasterTraderCtrl<TradeApi, AssetType, ExPlatformRes>

    private onSell(trade: ITradeCommit<AssetType, ExPlatformRes>) {
        this.botDrivenCurve.addTrade({
            price: trade.value.price,
            quantity: trade.value.quantity,
            side: trade.side,
            time: Date.now()
        })
    }

    private onBuy(trade: ITradeCommit<AssetType, ExPlatformRes>) {
        this.botDrivenCurve.addTrade({
            price: trade.value.price,
            quantity: trade.value.quantity,
            side: trade.side,
            time: Date.now()
        })
    }

    get Slaves() {
        return this.slaves
    }

    addSlave(slave: SlaveTraderCtrl<TradeApi, AssetType,  ExPlatformRes>) {
        slave.onsell = (trade: ITradeCommit<AssetType, ExPlatformRes>) => this.onSell(trade)
        slave.onbuy = (trade: ITradeCommit<AssetType, ExPlatformRes>) => this.onBuy(trade)
        slave.setSequalizer(this.sharedSequalizer)
        this.slaves.push(slave)
    }

    async filterSlaves(fn: (slave: SlaveTraderCtrl<TradeApi, AssetType, ExPlatformRes>) => Promise<boolean>): Promise<{
        removedCount: number,
        kept: Array<SlaveTraderCtrl<TradeApi, AssetType, ExPlatformRes>>
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

        for (const toRemove of removed) {
            await this.removeSlave(toRemove.Wallet)
        }

        return {
            removedCount: removed.length,
            kept: kept
        }
    }

    public async removeSlave(wallet: IDEXWallet) {
        const toRemove = this.slaves.find(s => s.Wallet.publicKey === wallet.publicKey && s.Wallet.secretKey === wallet.secretKey)
        if (toRemove) {
            const searchId = toRemove.id
            const { removed } = this.sharedSequalizer.filterQueue(
                t => t.id.includes(searchId))
            log.echo(`MasterTraderCtrl::removeSlave() removed ${removed.length} trades from queue`)
            await this.sharedSequalizer.waitTasksWithIdMatch(searchId)
            log.echo(`MasterTraderCtrl::removeSlave() all tasks awaited for slave ${searchId}`)

            this.slaves = this.slaves.filter(s => s.id !== searchId)
            log.echo(`MasterTraderCtrl::removeSlave() removed slave ${searchId}`)
        }
    }

    public async applyToSlaves(fn: (slave: SlaveTraderCtrl<TradeApi, AssetType, ExPlatformRes>, index: number) => Promise<void>) {
        for (let i = 0; i < this.slaves.length; i++) {
            await fn(this.slaves[i], i)
        }
    }

    public async loadOfferSequenceToSlave(
        offers: (IOffer&{side: TradeSideType})[],
        slaveSearch: (s: SlaveTraderCtrl<TradeApi, AssetType, ExPlatformRes>) => boolean
    ): Promise<{
        loaded: boolean,
        error?: string
    }> {
        let slave = this.slaves.find(slaveSearch)
        if (!slave) {
            throw new Error("MasterTraderCtrl::loadOfferSequenceToSlave() slave not found")
        }

        const canPerform = await slave.canPerformTradeSequence(offers)
        if (!canPerform) {
            return {
                loaded: false,
                error: "SlaveTraderCtrl::loadOfferSequenceToSlave() slave can't perform trade sequence"
            }
        }

        //slave.pushOffer(offers)

        return {
            loaded: true
        }
    }

    public async assetInfo() {
        return await this.tradeApi.assetInfo(this.tradeAsset)
    }

    public slavesCount() {
        return this.slaves.length
    }

    async run() {
        this._isRunning = true
        this.sharedSequalizer.run()

        const interval = 100

        while (this._isRunning) {
            const start = performance.now()
            
            sleep(interval)

            const end = performance.now()
            const delta = end - start

            if (delta < interval) {
                await sleep(interval - delta)
            }
        }
    }

    async terminate() {
        this._isRunning = false
        this.botDrivenCurve.saveToFile(this.curve_id)
        await this.sharedSequalizer.waitAll()
        await this.sharedSequalizer.terminate()
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
