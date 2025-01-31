import { MasterTraderCtrl, MTCContext, MTCState } from "bot/traider/mtc";
import { PumpFunTradeApi, WalletData } from "bot/traider/trade-api/pump.fun";
import { ITradeTxResult } from "bot/traider/types/trade";
import { PumpFunSTC } from "./stc";
import { SlaveTraderCtrl } from "bot/traider/stc";

import log from 'utils/logger'

class PumpFunMTCState_default extends MTCState {
}

class PumpFunMTCContext extends MTCContext {
    constructor(state: PumpFunMTCState_default) {
        super(state)
    }
}

export class PumpFunMTC extends MasterTraderCtrl<PumpFunTradeApi, WalletData, ITradeTxResult<any>> {
    constructor(
        coin_program_id: string,
        protected mintAddress: string,
        slaves_wallets: WalletData[],
    ) {
        const slaves: Array<SlaveTraderCtrl<PumpFunTradeApi, WalletData, ITradeTxResult<any>>> = []

        slaves_wallets.forEach((w) => {
            const slave = new PumpFunSTC(w)
            slave.Initialize()
            slaves.push(slave)
        })

        super(
            coin_program_id,
            slaves,
            new PumpFunTradeApi(),
            new PumpFunMTCContext(new PumpFunMTCState_default())
        )

        this.loopFn.bind(this)
        this.loopFn = async function(this: PumpFunMTC) {
            log.error("PumpFunMTC::loopFn() not redefined. Using default implementation with no functionality.")
        }
    }

    async run() {
        log.echo(`Starting PumpFunMTC. Coin program id: ${this.target}, mint address: ${this.mintAddress}`)
        super.run()
        log.echo("PumpFunMTC started")
    }
}
