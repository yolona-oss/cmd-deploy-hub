import { ThreadPool } from "utils/thread-pool";

import { BaseTradeApi } from "./trade-api/base-trade-api";

import log from 'utils/logger'
import { WithInit } from "types/with-init";
import { ITradeTxType, Trade } from "./types";
import { elapsedExec } from "utils/functional/elapced-exec";
import { retrier } from "utils/async-tools";
import { ITradeTxResult, TradeSide } from "./types/trade";
import EventEmitter from "events";
import { HMSTime } from "utils/time";

export interface ISTCMetrics<TxResType = any> {
    Trades: Array<Trade<TxResType>&{exec_time: number}>,
    SuccessTrades: Array<Trade<TxResType>&{exec_time: number}>,
    SellTrades: Array<Trade<TxResType>&{exec_time: number}>,
    BuyTrades: Array<Trade<TxResType>&{exec_time: number}>,
    ErrorTrades: Array<Trade<TxResType>&{exec_time: number}>,
    ErrorRate: number,
    BuyMeanPrice: bigint,
    SellMeanPrice: bigint,
    TotalBuyVolume: bigint,
    TotalSellVolume: bigint,
    TotalBuyVolumePrice: bigint,
    TotalSellVolumePrice: bigint
}

// TODO: remove trades array and save data exacly in the metrics
export class STCMetrics<TxResType = any> {
    protected trades: Array<Trade<TxResType>&{exec_time: number}> = []

    public reset() {
        this.trades = []
    }

    public addTrade(trade: Trade&{exec_time: number}) {
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

    public BuyMeanPrice(): bigint {
        return BigInt(
            this.BuyTrades(true)
                .reduce((acc: bigint, trade) => acc + trade.value.price, BigInt(0)) / BigInt(this.BuyTrades().length)
        )
    }

    public SellMeanPrice(): bigint {
        return this.SellTrades(true)
            .reduce((acc: bigint, trade) => acc + trade.value.price, BigInt(0)) / BigInt(this.SellTrades().length)
    }

    public TotalBuyVolume(): bigint {
        return this.BuyTrades(true)
            .reduce((acc: bigint, trade) => acc + trade.value.quantity, BigInt(0))
    }

    public TotalSellVolume(): bigint {
        return this.SellTrades(true)
            .reduce((acc: bigint, trade) => acc + trade.value.quantity, BigInt(0))
    }

    public TotalBuyVolumePrice(): bigint {
        return this.BuyMeanPrice() * this.TotalBuyVolume()
    }

    public TotalSellVolumePrice(): bigint {
        return this.SellMeanPrice() * this.TotalSellVolume()
    }

    public agregate(): ISTCMetrics<TxResType> {
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
        }
    }
}

// TODO: add options to stop trading with some signals form the outside or
//       by some other means like exchange events or exchange curve crashes
export abstract class SlaveTraderCtrl<TradeAPI extends BaseTradeApi<WalletType, TxResType>, WalletType extends object, TxResType> extends WithInit {
    static slaveOrdinaryNumber = 0

    protected threadPool: ThreadPool
    protected _metrics: STCMetrics<TxResType>

    onbuy: (trade: Trade<TxResType>) => void  = () => {}
    onsell: (trade: Trade<TxResType>) => void = () => {}

    constructor(
        private tradeApi: TradeAPI,
        protected wallet: WalletType,
    ) {
        super()
        this.threadPool = new ThreadPool()
        this._metrics = new STCMetrics()
    }

    public metrics(): ISTCMetrics<TxResType> {
        return this._metrics.agregate()
    }

    /**
    * @param{boolean} forse - if true, will not wait for the thread poool to finish. By default the scheduling will wait for all tasks to finish
    */
    async stop(forse: boolean = false) {
        if (this.threadPool.getMetrics().totalTasks > 0 && !forse) {
            await this.threadPool.waitTasks()
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
        //try {
        //    log.echo(`Connecting to platform ${this.tradeApi.name}...`)
        //    await this.tradeApi.connect(this.apiKey, this.secret)
        //} catch (e) {
        //    throw `Failed to connect to platform ${this.tradeApi.name}: ${JSON.stringify(e,null,4)}`
        //}
        //log.echo(`Connected to platform ${this.tradeApi}`)
        this.threadPool.run()

        this.setInitialized()
    }

    pushSell(opt: {target: string, tx: ITradeTxType, slippage?: bigint, fee?: any}, delay?: number): string {
        const id = `${SlaveTraderCtrl.slaveOrdinaryNumber}-sell-${opt.target}`
        this.threadPool.enqueue({
            id,
            delay: delay ? new HMSTime({milliseconds: delay}) : undefined,
            command: {
                execute: async () => {
                    const { elapsed, result } = await elapsedExec(
                        retrier<ITradeTxResult<TxResType>>(
                            () => this.tradeApi.sell({
                                ...opt,
                                traider: this.wallet,
                            }),
                            {
                                retries: 1,
                                timeout: 4000
                            }
                        )
                    )
                    this._metrics.addTrade({
                        symbol: opt.target, // todo
                        target: opt.target,
                        side: TradeSide.Sell,
                        value: opt.tx,
                        result,
                        exec_time: elapsed
                    })
                    if (result.success) {
                        this.onsell({
                            symbol: opt.target, // todo
                            target: opt.target,
                            side: TradeSide.Sell,
                            value: opt.tx,
                            result,
                        })
                    }
                }
            }
        })
        return id
    }

    pushBuy(opt: {target: string, tx: ITradeTxType, slippage?: bigint, fee?: any}, delay?: number): string {
        const id = `${SlaveTraderCtrl.slaveOrdinaryNumber}-buy-${opt.target}`
        this.threadPool.enqueue({
            id,
            delay: delay ? new HMSTime({milliseconds: delay}) : undefined,
            command: {
                execute: async () => {
                    const { elapsed, result } = await elapsedExec(
                        retrier<ITradeTxResult<TxResType>>(
                            () => this.tradeApi.buy({
                                ...opt,
                                traider: this.wallet
                            }),
                            {
                                retries: 1,
                                timeout: 4000
                            }
                        )
                    )
                    this._metrics.addTrade({
                        symbol: opt.target, // todo
                        target: opt.target,
                        side: TradeSide.Buy,
                        value: opt.tx,
                        result,
                        exec_time: elapsed
                    })
                    if (result.success) {
                        this.onbuy({
                            symbol: opt.target, // todo
                            target: opt.target,
                            side: TradeSide.Buy,
                            value: opt.tx,
                            result,
                        })
                    }
                }
            }
        })
        return id;
    }
}
