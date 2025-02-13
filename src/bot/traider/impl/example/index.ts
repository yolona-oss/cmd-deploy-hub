import { SlaveTraderCtrl } from "../../stc";

import { ExampleMTC, ExampleSTC } from "./workers";

import log from "utils/logger";

import { ExampleTradeApi } from "./api";
import { curveToTxList } from "../../helpers/curve-creator";
import { Bezier } from "utils/math/curve/bezier";
import { randomizeWithScatter } from "utils/random";
import { ITradeSupply } from "../../types/trade";
import { ExExAssetType } from "./asset-type";

import { MAIN_TOKEN_NAME } from "./api";

export async function example() {
    let wallets: any[] = [
        { publicKey: "0x0" },
        { publicKey: "0x1" },
        //{ publicKey: "0x2" },
        //{ publicKey: "0x3" },
        //{ publicKey: "0x4" },
        //{ publicKey: "0x5" },
        //{ publicKey: "0x6" },
        //{ publicKey: "0x7" },
        //{ publicKey: "0x8" },
        //{ publicKey: "0x9" },
    ]

    const TradersAsset: ExExAssetType = {
        market_id: "exex-coin-market-id",
        mint: "0x0f0f0f0f0f0f0f0f",
        symbol: "ex-ex"
    }
    const api = new ExampleTradeApi()

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
            if (balance.find(b => b.currency === MAIN_TOKEN_NAME)!.balance < 1_000) {
                await api.addBalance({ publicKey: "", secretKey: "" }, w, 1_0_000 - balance.find(b => b.currency === MAIN_TOKEN_NAME)!.balance)
            }
        }
    }

    try {
        await api.createAsset(TradersAsset, 1_000_000)
    } catch (e) {
        log.echo(await api.assetInfo(TradersAsset))
    }

    const mtc = new ExampleMTC(TradersAsset, wallets)
    mtc.run()
    log.echo("MasterTraderCtrl initialized")

    //const from = BigInt(1000000000)
    //const to = BigInt(2000000000)
    log.echo("Generating curve...")

    const asset = mtc.tradeAsset
    log.echo(`Asset: ${asset}`)

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
        volumeCurve.map(v => ({y: Math.floor(v.y), x: v.x})),
        {
            pricePerc: 1,
            volumePerc: 0
        },
    )
    log.echo(`Generated ${generatedTx.length} txs`)

    log.echo(`Assigning ${generatedTx.length} txs to ${tradableSlavesCount} slaves...`)
    const tx_chunks = new Array<ITradeSupply<number>[]>()
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
    mtc.applyToSlaves(async (slave: SlaveTraderCtrl<ExampleTradeApi, ExExAssetType, any>, i) => {
        for (const tx of tx_chunks[i]) {
            //slave.pushBoth({
            //    trade: {
            //        asset,
            //        tx
            //    },
            //    setup: {
            //        delay: randomizeWithScatter(0, 5) as number
            //    }
            //})
        }
    })
    log.echo("Txs pushed")


}
