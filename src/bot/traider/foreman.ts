import { MasterTraderCtrl } from "./mtc"
import { SlaveTraderCtrl } from "./stc"

import { BumpPumpParam, BumpPump, priceStepScatterFn } from "./helpers/curve-creator"
import { randomizeWithScatter } from "utils/random"

export class Foreman {
    constructor(
        private tradeMaster: MasterTraderCtrl<any, any, any>
    ) {
    }

    async gogogo() {
        this.tradeMaster.setLoopFn(this.foremanLoop)

        this.tradeMaster.run()
    }

    async tradeWithBumpPump(
        priceParam: BumpPumpParam,
        perSlaveTx: number,
        slaves: Array<SlaveTraderCtrl<any, any, any>>
    ) {
        const target = this.tradeMaster.target
        const tradableSlavesCount = slaves.length

        const generatedTx = BumpPump(
            priceParam,
            perSlaveTx * tradableSlavesCount
        )

        const tx_chunks = new Array(tradableSlavesCount)
        // NOTE: maybe should randomize tx count per slave?
        for (let i = 0; i < generatedTx.length; i += perSlaveTx) {
            tx_chunks.push(generatedTx.slice(i, i + perSlaveTx))
        }

        for (let i = 0; i < tradableSlavesCount; i++) {
            const slave = slaves[i]
            for (const tx of tx_chunks[i]) {
                slave.pushSell({
                    target,
                    tx: {
                        quantity: BigInt(tx.amount),
                        price: BigInt(tx.price)
                    }
                }, randomizeWithScatter(0, 5))
                slave.pushBuy({
                    target,
                    tx: {
                        quantity: BigInt(tx.amount),
                        price: BigInt(tx.price)
                    }
                }, randomizeWithScatter(0, 5))
            }
        }
    }

    async foremanLoop(slaves: Array<SlaveTraderCtrl<any, any, any>>) {
        const info = await this.tradeMaster.targetInfo()
        slaves
    }
}
