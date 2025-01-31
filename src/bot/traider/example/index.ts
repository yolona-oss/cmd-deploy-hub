import { MasterTraderCtrl, MTCContext, MTCState } from "../mtc";
import { SlaveTraderCtrl } from "../stc";
import { IBalance, ITargetInfo, ITradeTxResult, Trade, TradeOffer } from "../types";
import { BaseTradeApi } from "../trade-api/base-trade-api";
import { randomUUID } from "crypto";

import { BumpPump } from "../helpers/curve-creator";

import log from "utils/logger";
import { BumpPumpParamBuilder } from "../helpers/curve-creator/bumppump";
import { randomizeWithScatter } from "utils/random";

class ExampleCoin {
    public marketCap: bigint = 0n
    public volume: bigint = 0n 
    //public curPrice: bigint = 1n
    public curSupply: bigint = 100000000000n
    public holders: bigint = 0n
}

class ExampleExchangePlatform {
    public tradesStore: Array<Trade> = new Array()


    public trades(range: Range) {
        return Promise.resolve({
            trades: this.tradesStore,
            overallTxCount: 0,
            limit: 0,
            offset: 0,
        })
    }

    public coins: Array<>

    public buy(opt: TradeOffer<ExampleExchangeCoin>) {
        
    }
}

class ExampleTradeApi extends BaseTradeApi<{cardId: string}, any> {
    constructor() {
        super("example-coin-api")
    }

    Balance(traider: {cardId: string}): Promise<IBalance> {
        traider
        throw new Error("Method not implemented.");
    }
    async TargetInfo(target: string): Promise<ITargetInfo> {
        target
        return {
            MC: 1n,
            Volume: 1n,
            CurPrice: 1n,
            CurSupply: 1n,
            Holders: 1n,
            trades: async () => {
                return {
                    trades: new Array(),
                    overallTxCount: 0,
                    limit: 0,
                    offset: 0,
                }
            }
        }
    }

    buy(opt: TradeOffer<{cardId: string}>): Promise<ITradeTxResult<any>> {
        opt
        throw new Error("Method not implemented.");
    }
    sell(opt: TradeOffer<{cardId: string}>): Promise<ITradeTxResult<any>> {
        opt
        throw new Error("Method not implemented.");
    }
}

class ExampleSTC extends SlaveTraderCtrl<ExampleTradeApi, {cardId: string}, any> {
    constructor(wallet: {cardId: string}) {
        super(
            new ExampleTradeApi(),
            wallet
        )
    }
}

class EMTC_CommonState extends MTCState {
    constructor() {
        super()
    }
}

class EMTCCtx extends MTCContext {
    constructor(state: EMTC_CommonState) {
        super(state)
    }
}

class ExampleMTC extends MasterTraderCtrl<ExampleTradeApi, {cardId: string}, any> {
    constructor(
        wallets: Array<{cardId: string}>,
    ) {
        const slaves: Array<SlaveTraderCtrl<ExampleTradeApi, {cardId: string}, any>> = []
        wallets.forEach((w) => {
            const slave = new ExampleSTC(w)
            slave.Initialize()
            slaves.push(slave)
        })

        super(
            `example-coin-${randomUUID()}`,
            slaves,
            new ExampleTradeApi(),
            new EMTCCtx(new EMTC_CommonState())
        )

        this.loopFn.bind(this)
        this.loopFn = async function(this: ExampleMTC) {
            log.error("ExampleMTC::loopFn() not redefined. Using default implementation with no functionality.")
        }
    }
}

export async function example() {
    const wallets = [
        {cardId: "card-1"},
        {cardId: "card-2"},
        {cardId: "card-3"},
    ]

    const mtc = new ExampleMTC(wallets)
    await mtc.run()

    let bpBuilder = new BumpPumpParamBuilder()
    bpBuilder
        .setPrice(BigInt("1000000000"), BigInt("2000000000"))
        .setVolume(100)
        .setScatterPrice((cur, prev) => {
            prev
            return randomizeWithScatter(cur, 5)
        })
        .setScatterVolume((cur, prev) => {
            prev
            return randomizeWithScatter(cur, 5)
        })
        .setPriceStepScatter((cur, prev, curStep, overallSteps) => {
            cur
            prev
            curStep
            overallSteps
            return randomizeWithScatter(cur, 5)
        })

    //////////////////////////////

    const target = mtc.target

    const perSlaveTx = 1000
    const tradableSlavesCount = mtc.slavesCount()

    const bpParams = bpBuilder.build()
    const generatedTx = BumpPump(
        bpParams,
        perSlaveTx * tradableSlavesCount
    )

    const tx_chunks = new Array(tradableSlavesCount)
    // NOTE: maybe should randomize tx count per slave?
    for (let i = 0; i < generatedTx.length; i += perSlaveTx) {
        tx_chunks.push(generatedTx.slice(i, i + perSlaveTx))
    }

    // NOTE: this is posiblely wrong?
    if (tx_chunks.length !== tradableSlavesCount) {
        throw new Error("tx_chunks.length !== tradableSlavesCount")
    }

    mtc.applyToSlaves((slave: SlaveTraderCtrl<ExampleTradeApi, {cardId: string}, any>, i) => {
        for (const tx of tx_chunks[i]) {
            slave.pushSell({
                target,
                tx: {
                    quantity: BigInt(tx.amount),
                    price: BigInt(tx.price)
                }
            }, randomizeWithScatter(0, 5) as number)
            slave.pushBuy({
                target,
                tx: {
                    quantity: BigInt(tx.amount),
                    price: BigInt(tx.price)
                }
            }, randomizeWithScatter(0, 5) as number)
        }
    })

    //mtc.setLoopFn(async function(this: ExampleMTC, slaves: Array<SlaveTraderCtrl<ExampleTradeApi, {cardId: string}, any>>) {
    //
    //})
}


