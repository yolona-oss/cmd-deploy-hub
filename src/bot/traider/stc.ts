import EventEmitter from "events";

import { ThreadPool } from "utils/thread-pool";
import { HMSTime } from "utils/time";
import { WithInit } from "types/with-init";
import { Trade, TradeOffer, TradeSide, TradeSideType } from "./types/trade";
import { BaseTradeApi } from "./trade-api/base-trade-api";
import { STCMetrics, ISTCMetrics } from "./stc-metric";

import { ICommand } from "types/command";
import { IClonable } from "types/clonable";
import { Cloner } from "utils/cloner";
import log from 'utils/logger'
import { DEXWallet, ITraider } from "./types";
import { IBaseTradeTarget } from "./types/trade-target";

export interface CmdPushOfferOpts<TradeTarget extends IBaseTradeTarget = IBaseTradeTarget> {
    trade: Omit<TradeOffer<TradeTarget>, "traider">
    exe?: {
        declineIf?: (wallet: DEXWallet, trade: Omit<TradeOffer<TradeTarget>, "traider">) => Promise<boolean>
        declineCascade?: boolean
    }
    setup?: {
        delay?: number,
        retries?: number,
        timeout?: number
    }
}

class OfferCmd<TradeTarget extends IBaseTradeTarget = IBaseTradeTarget> extends EventEmitter implements ICommand<void> {
    private id: string
    private api: BaseTradeApi<TradeTarget, any>
    private cmd_opt: CmdPushOfferOpts<TradeTarget>
    private traider: ITraider
    private side: TradeSideType

    constructor(config: {
        id: string,
        api: BaseTradeApi<TradeTarget, any>,
        opt: CmdPushOfferOpts<TradeTarget>,
        traider: ITraider,
        side: TradeSideType
    }) {
        super()
        this.id = config.id
        this.api = config.api.clone()
        this.cmd_opt = Object.assign({}, config.opt)
        this.traider = Object.assign({}, config.traider)
        this.side = config.side
    }

    async execute() {
        const trade = this.cmd_opt.trade
        const { target, tx } = trade
        const { exe } = this.cmd_opt
        const id = this.id

        const offerFn = this.side === TradeSide.Buy ? this.api.buy : this.api.sell

        if (exe?.declineIf) {
            if (await exe.declineIf(this.traider.wallet, this.cmd_opt.trade)) {
                if (exe.declineCascade) {
                    this.emit("DropAll", id)
                    return
                }
                this.emit("DropOne", id)
                return
            }
        }

        const start = performance.now()
        let exeResult
        let error
        try {
            exeResult = await offerFn({
                ...trade,
                traider: this.traider
            })
        } catch (e) {
            error = e
            log.error("OfferCmd::execute():", e)
        }

        const result = exeResult === null || exeResult === undefined ?
            { success: false, error: error }
            :
            exeResult

        const mappedTx = {
            time: Date.now(),
            target: target,
            side: TradeSide.Sell,
            value: tx,
            result
        }

        this.emit("Done", id, mappedTx, performance.now() - start)
    }
}

// TODO: add options to stop trading with some signals form the outside or
//       by some other means like exchange events or exchange curve crashes
export abstract class SlaveTraderCtrl<
            TradeAPI extends BaseTradeApi<TradeTarget, PlatformResData> = BaseTradeApi,
            TradeTarget extends IBaseTradeTarget = IBaseTradeTarget,
            PlatformResData = never>
        extends WithInit implements IClonable {
    static slaveOrdinaryNumber = 0

    protected tradeApi: TradeAPI
    protected threadPool: ThreadPool
    protected _metrics: STCMetrics<TradeTarget, PlatformResData>

    protected traider: ITraider

    onbuy: (trade: Trade<TradeTarget, PlatformResData>) => void  = () => {}
    onsell: (trade: Trade<TradeTarget, PlatformResData>) => void = () => {}

    constructor(
        tradeApi: TradeAPI,
        wallet: DEXWallet
    ) {
        super()
        this.tradeApi = tradeApi.clone()
        this.threadPool = new ThreadPool()
        this._metrics = new STCMetrics()
        this.traider = {
            wallet: wallet
        }
        this.setUninitialized()

        //setInterval(() => {
        //    console.log(this.metrics())
        //}, 1000)
    }

    abstract clone(): SlaveTraderCtrl<TradeAPI, TradeTarget, PlatformResData>

    public get Wallet(): DEXWallet {
        return new Cloner(this.traider.wallet).clone()
    }

    public async canPerformTradeSequence(offers: TradeOffer[]): Promise<{
        success: boolean
        rest: number
        balance: number
        avgFee: number
        avgSlippage: number
        avgPrice: number
        avgQuantity: number
    }> {
        const avgFee = offers.reduce((acc, o: TradeOffer) => acc + (o.fee ?? 0), 0) / offers.length
        const avgSlippage = offers.reduce((acc, o: TradeOffer) => acc + (o.slippage ?? 0), 0) / offers.length
        const avgPrice = offers.reduce((acc, o: TradeOffer) => acc + o.tx.price, 0) / offers.length
        const avgQuantity = offers.reduce((acc, o: TradeOffer) => acc + o.tx.quantity, 0) / offers.length

        const balance = await this.tradeApi.balance(this.traider.wallet)

        return {
            success: balance > avgFee + avgSlippage + avgPrice * avgQuantity,
            rest: balance - avgFee - avgSlippage - avgPrice * avgQuantity,
            balance,
            avgFee,
            avgSlippage,
            avgPrice,
            avgQuantity
        }
    }

    public metrics(): ISTCMetrics<TradeTarget, PlatformResData> {
        return this._metrics.agregate()
    }

    /**
    * @param{boolean} forse - if true, will not wait for the thread poool to finish. By default the scheduling will wait for all tasks to finish
    */
    async stop(forse: boolean = false) {
        if (this.threadPool.getMetrics().totalTasks > 0 && !forse) {
            await this.threadPool.waitAll()
        }
        await this.threadPool.terminate()
        this.setUninitialized()
    }

    async Initialize() {
        if (SlaveTraderCtrl.slaveOrdinaryNumber >= Number.MAX_VALUE-1) {
            log.warn(`SlaveTraderCtrl.slaveOrdinaryNumber overflowed. Resetting to 0`)
            SlaveTraderCtrl.slaveOrdinaryNumber = 0
        }
        SlaveTraderCtrl.slaveOrdinaryNumber++
        log.echo(`Initializing trading slave. Ordinary number: ${SlaveTraderCtrl.slaveOrdinaryNumber}.`)
        this.threadPool.run()

        this.setInitialized()
    }

    async pushBoth(opt: CmdPushOfferOpts<TradeTarget>) {
        if (!opt.exe) {
            opt.exe = { }
        }
        const sellId = this.pushSell(opt)
        this.pushBuy(opt, sellId)
    }

    pushSell(opt: CmdPushOfferOpts<TradeTarget>, afterId?: string) {
        return this.pushOffer(opt, TradeSide.Sell, afterId)
    }

    pushBuy(opt: CmdPushOfferOpts<TradeTarget>, afterId?: string) {
        return this.pushOffer(opt, TradeSide.Buy, afterId)
    }

    private pushOffer(
        opt: CmdPushOfferOpts<TradeTarget>,
        side: TradeSideType,
        afterId?: string
    ) {
        const delay = opt.setup?.delay
        //const retries = opt.setup?.retries || 1
        //const timeout = opt.setup?.timeout
        const id = `${SlaveTraderCtrl.slaveOrdinaryNumber}-${side}-${opt.trade.target}-${this.threadPool.genId()}`

        const cmd = new OfferCmd<TradeTarget>({
            id, opt, side,
            api: this.tradeApi,
            traider: this.traider
        })

        cmd.on("Done", this._handleCmdDone.bind(this))
        cmd.on('DropOne', this._handleCmdDrop.bind(this))
        cmd.on('DropAll', this._handleCmdDropAll.bind(this))

        this.threadPool.enqueue({
            id,
            delay: delay ? new HMSTime({milliseconds: delay}) : undefined,
            command: cmd,
            after: afterId
        })
        return id
    }

    private _handleCmdDone(id: string, tx: Trade<TradeTarget, PlatformResData>, execTime: number) {
        console.log(`"${id}" done. success: ${tx.result.success}`)
        this._metrics.addTrade({...tx, exec_time: execTime})
        if (tx.side === TradeSide.Sell) {
            this.onsell(tx)
        } else {
            this.onbuy(tx)
        }
    }

    private _handleCmdDrop(id: string) {
        console.log(`"${id}" dropped.`)
        this._metrics.increaseDroped()
    }

    private _handleCmdDropAll(id: string) {
        console.log(`after "${id}" all dropped.`)
        const {droped, unDropable} = this.threadPool.dropTasks()
        console.log(`"${unDropable}" already in execution pipeline. ${droped} dropped.`)
        this._metrics.increaseDroped(droped)
    }
}
