import { SlaveTraderCtrl } from "../../stc";
import { MasterTraderCtrl, MTCContext, MTCState } from "../../mtc";
import { ExampleTradeApi } from "./api";
import { ExExTargetType } from "./target-type";
import { DEXWallet } from "bot/traider/types";

export class ExampleSTC extends SlaveTraderCtrl<ExampleTradeApi, ExExTargetType, any> {
    constructor(wallet: DEXWallet, api: ExampleTradeApi) {
        super(api, wallet)
    }

    clone() {
        return new ExampleSTC(this.traider.wallet, this.tradeApi)
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

export class ExampleMTC extends MasterTraderCtrl<ExampleTradeApi, ExExTargetType, any> {
    constructor(
        target: ExExTargetType,
        wallets: Array<DEXWallet>,
    ) {
        const slaves: Array<SlaveTraderCtrl<ExampleTradeApi, ExExTargetType, any>> = []
        wallets.forEach((w) => {
            const slave = new ExampleSTC(w, new ExampleTradeApi())
            slave.Initialize()
            slaves.push(slave)
        })
        super(
            target,
            slaves,
            new ExampleTradeApi(),
            new EMTCCtx(new EMTC_CommonState())
        )
    }

    clone() {
        return new ExampleMTC(this.target, [])
    }

    async terminate(): Promise<void> {
        await super.terminate()
    }
}
