import { SlaveTraderCtrl } from "../../stc";

import { ExampleMTC, ExampleSTC } from "./workers";

import log from "utils/logger";

import { ExampleTradeApi } from "./api";
import { curveToTxList } from "../../helpers/curve-creator";
import { Bezier } from "utils/math/curve/bezier";
import { randomizeWithScatter } from "utils/random";
import { ITradeTargetValue } from "../../types/trade";
import { DiagnosticMessage } from "typescript";
import { DEXWallet } from "bot/traider/types";
import { ExExTargetType } from "./target-type";


export async function example() {
    let wallets: any[] = [
        { publicKey: "0x0" },
        { publicKey: "0x1" },
        { publicKey: "0x2" },
        { publicKey: "0x3" },
        { publicKey: "0x4" },
        { publicKey: "0x5" },
        { publicKey: "0x6" },
        { publicKey: "0x7" },
        { publicKey: "0x8" },
        { publicKey: "0x9" },
    ]

    const TradersTarget: ExExTargetType = {
        market_id: "exex-coin-market-id",
        mint: "0x0f0f0f0f0f0f0f0f",
        symbol: "ex-ex"
    }
    const api = new ExampleTradeApi()

    const r = await api.sell({ traider: { wallet: {publicKey: "0x1", secretKey: "0x0"} }, target: TradersTarget, tx: {price: 20, quantity: 100} })
    console.log(r)

    return
    for (let i = 0; i < wallets.length; i++) {
        let w = wallets[i]
        let res: any
        try {
            res = await api.createTraider(w)
        } catch (e) {
            log.error(`Cannot create traider:`, e)
        }
        wallets[i] = res
        w = res
        //@ts-ignore
        if (res?.alreadyExists === false) {
            await api.addBalance({ publicKey: "", secretKey: "" }, w, 1_0_000)
        } else {
            const balance = await api.balance(w)
            if (balance < 1_0_000) {
                await api.addBalance({ publicKey: "", secretKey: "" }, w, 1_0_000 - balance)
            }
        }
    }

    try {
        await api.createTarget(TradersTarget, 1_000_000)
    } catch (e) {
        console.log("target already exists:")
        console.log(await api.targetInfo(TradersTarget))
    }

    const mtc = new ExampleMTC(TradersTarget, wallets)
    mtc.run()
    log.echo("MasterTraderCtrl initialized")

    //const from = BigInt(1000000000)
    //const to = BigInt(2000000000)
    log.echo("Generating curve...")

    const target = mtc.target
    log.echo(`Target: ${target}`)

    const perSlaveTx = 10
    const tradableSlavesCount = mtc.slavesCount()
    log.echo(`Slaves count: ${tradableSlavesCount}`)

    log.echo(`Start generating ${perSlaveTx*tradableSlavesCount} txs...`)
    const priceCurve = Bezier.compositeAny([
        {x: 1, y: 1},
        {x: 1, y: 2},
        {x: 1, y: 3},
        {x: 1, y: 4},
    ], perSlaveTx*tradableSlavesCount)
    const volumeCurve = Bezier.compositeAny([
        {x: 1, y: 1},
        {x: 1, y: 2},
        {x: 1, y: 3},
        {x: 1, y: 4},
    ], perSlaveTx*tradableSlavesCount)
    const generatedTx = curveToTxList(
        priceCurve,
        volumeCurve,
        1, 1
    )
    log.echo(`Generated ${generatedTx.length} txs`)

    log.echo(`Assigning ${generatedTx.length} txs to ${tradableSlavesCount} slaves...`)
    const tx_chunks = new Array<ITradeTargetValue<number>[]>()
    // NOTE: maybe should randomize tx count per slave?
    for (let i = 0; i < generatedTx.length-perSlaveTx; i += perSlaveTx) {
        log.echo(`${i}:${i + perSlaveTx}`)
        tx_chunks.push(generatedTx.slice(i, i + perSlaveTx))
    }

    // NOTE: this is posiblely wrong?
    if (tx_chunks.length !== tradableSlavesCount) {
        throw new Error("tx_chunks.length !== tradableSlavesCount")
    }

    log.echo(`Pushing txs to slaves...`)
    mtc.applyToSlaves(async (slave: SlaveTraderCtrl<ExampleTradeApi, ExExTargetType, any>, i) => {
        for (const tx of tx_chunks[i]) {
            slave.pushBoth({
                trade: {
                    target,
                    tx
                },
                setup: {
                    delay: randomizeWithScatter(0, 5) as number
                }
            })
        }
    })
    log.echo("Txs pushed")


}
