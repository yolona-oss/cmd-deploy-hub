import { ITradeCommit, IOffer, TradeSideConst, TradeSideType } from "./types/trade";
import { IDEXWallet } from "./types/wallet";
import { ITraider } from "./types/traider";
import { IBaseTradeAsset } from "./types/asset";
import { IClonable } from "types/clonable";
import { Identificable } from "types/identificable";

import { BaseTradeApi } from "./trade-api/base-trade-api";
import { STCMetrics, ISTCMetrics } from "./stc-metric";

import { Sequalizer } from "utils/sequalizer";
import { HMSTime } from "utils/time";

import { Cloner } from "utils/cloner";
import log from 'utils/logger'

import { OfferCmd, ICmdPushOfferOpts } from "./offer-cmd"
export { type ICmdPushOfferOpts as CmdPushOfferOpts } from "./offer-cmd"

export type CheckPerformErrorType = "balance" | "asset"

export abstract class SlaveTraderCtrl<
            TradeAPI extends BaseTradeApi<TradeAsset, PlatformResData> = BaseTradeApi,
            TradeAsset extends IBaseTradeAsset = IBaseTradeAsset,
            PlatformResData = never>
        implements IClonable, Identificable<string> {
    static slaveOrdinaryNumber = 0

    protected tradeApi: TradeAPI
    protected sequalizer?: Sequalizer
    protected _metrics: STCMetrics<TradeAsset, PlatformResData>

    protected tradeCurrency: string
    protected traider: ITraider

    onbuy: (trade: ITradeCommit<TradeAsset, PlatformResData>) => void  = () => {}
    onsell: (trade: ITradeCommit<TradeAsset, PlatformResData>) => void = () => {}
    on_cmd_failed: (cmd: OfferCmd<TradeAsset>) => void = () => {}

    constructor(
        public readonly id: string,
        tradeApi: TradeAPI,
        wallet: IDEXWallet,
        tradeCurrency: string,
        sharedSequalizer?: Sequalizer
    ) {
        this.tradeApi = tradeApi.clone()
        this.sequalizer = sharedSequalizer
        this._metrics = new STCMetrics()
        this.traider = {
            wallet: Object.assign({}, wallet)
        }
        this.tradeCurrency = tradeCurrency

        if (SlaveTraderCtrl.slaveOrdinaryNumber >= Number.MAX_VALUE-1) {
            log.warn(`SlaveTraderCtrl.slaveOrdinaryNumber overflowed. Resetting to 0`)
        }
        SlaveTraderCtrl.slaveOrdinaryNumber = 0
    }

    abstract clone(newId: string, newTraider: ITraider): SlaveTraderCtrl<TradeAPI, TradeAsset, PlatformResData>

    public setSequalizer(sequalizer: Sequalizer) {
        this.sequalizer = sequalizer
    }

    public get Wallet(): IDEXWallet {
        return new Cloner(this.traider.wallet).clone()
    }

    public async canPerformTradeSequence(offers: (IOffer&{side: TradeSideType})[]): Promise<{
        success: boolean
        spent: number
        error?: {
            msg: string,
            err: CheckPerformErrorType
        },
        rest: number
    }> {
        const balance = await this.tradeApi.balance(this.traider.wallet)
        let avalibleBalance = balance.find(b => b.currency === this.tradeCurrency)!.balance

        let assets = balance.filter(b => b.currency !== this.tradeCurrency).map(b => ({
            market_id: b.currency,
            quantity: b.balance,
        }))

        let error: {
            msg: string,
            err: CheckPerformErrorType
        } | undefined = undefined

        let i = 0
        for (const offer of offers) {
            const asset = assets.find(a => a.market_id === offer.asset.market_id)

            if (offer.side === TradeSideConst.Sell) {
                if (asset) {
                    avalibleBalance += asset.quantity * offer.value.price
                    asset.quantity -= offer.value.quantity
                    if (asset.quantity < 0) {
                        error = {
                            msg: `On offer number: ${i+1} asset: ${offer.asset.market_id} quantity is less than 0`,
                            err: "asset"
                        }
                        break
                    }
                } else {
                    error = {
                        msg: `On offer number: ${i+1} no asset: ${offer.asset.market_id} rest`,
                        err: "asset"
                    }
                    break;
                }
            } else {
                avalibleBalance -= offer.value.price * offer.value.quantity
                if (avalibleBalance < 0) {
                    error = {
                        msg: `On offer number: ${i+1} balance is less than 0`,
                        err: "balance"
                    }
                    break
                }
                if (asset) {
                    asset.quantity += offer.value.quantity
                } else {
                    assets.push({
                        market_id: offer.asset.market_id,
                        quantity: offer.value.quantity
                    })
                }
            }
            i++
        }

        return {
            success: !error,
            error: error,
            spent: balance.find(b => b.currency === this.tradeCurrency)!.balance - avalibleBalance,
            rest: avalibleBalance,
        }
    }

    public metrics(): ISTCMetrics<TradeAsset, PlatformResData> {
        return this._metrics.agregate()
    }

    pushSell(opt: ICmdPushOfferOpts<TradeAsset>, afterId?: string) {
        return this.pushOffer(opt, TradeSideConst.Sell, afterId)
    }

    pushBuy(opt: ICmdPushOfferOpts<TradeAsset>, afterId?: string) {
        return this.pushOffer(opt, TradeSideConst.Buy, afterId)
    }

    private pushOffer(
        opt: ICmdPushOfferOpts<TradeAsset>,
        side: TradeSideType,
        afterId?: string
    ) {
        const delay = opt.setup?.delay
        //const retries = opt.setup?.retries || 1
        //const timeout = opt.setup?.timeout
        const id = `${this.id}-${SlaveTraderCtrl.slaveOrdinaryNumber}-${side}-${opt.trade.asset.market_id}-${this.sequalizer!.genId()}`

        const cmd = new OfferCmd<TradeAsset>({
            id, opt, side,
            api: this.tradeApi,
            traider: this.traider
        })

        cmd.on("Done", (id: string, tx: ITradeCommit<TradeAsset, PlatformResData>, execTime: number) => this._handleCmdDone.bind(this)(id, tx, execTime))
        cmd.on('DropOne', this._handleCmdDrop.bind(this))
        cmd.on('DropAll', this._handleCmdDropAll.bind(this))

        this.sequalizer!.enqueue({
            id,
            delay: delay ? new HMSTime({milliseconds: delay}) : undefined,
            command: cmd,
            after: afterId
        })
        return id
    }

    ////////////////////////

    private _handleCmdDone(id: string, tx: ITradeCommit<TradeAsset, PlatformResData>, execTime: number) {
        console.log(`"${id}" done. success: ${tx.result.success}`)
        this._metrics.addTrade({...tx, exec_time: execTime})
        if (tx.side === TradeSideConst.Sell) {
            this.onsell(tx)
        } else {
            this.onbuy(tx)
        }
        if (!tx.result.success) {
            //this.on_cmd_failed(cmd, tx)
            const { droped, unDropable } = this.sequalizer!.dropTasks()
            console.log(`"${unDropable}" already in execution pipeline. ${droped} dropped.`)
            this._metrics.increaseDroped(droped)
        }
    }

    private _handleCmdDrop(id: string) {
        console.log(`"${id}" dropped.`)
        this._metrics.increaseDroped()
    }

    private _handleCmdDropAll(id: string) {
        console.log(`after "${id}" all dropped.`)
        const {droped, unDropable} = this.sequalizer!.dropTasks()
        console.log(`"${unDropable}" already in execution pipeline. ${droped} dropped.`)
        this._metrics.increaseDroped(droped)
    }
}
