import { MasterTraderCtrl } from "../mtc";
import { SlaveTraderCtrl } from "../stc";
import { BaseTradeApi } from "../trade-api/base-trade-api";

import { ExampleSTC, ExampleMTC } from "./example/workers";
import { ExampleTradeApi } from "./example/api";

import log from "utils/logger";
import { BaseWalletManager, SolanaWalletManager } from "../wallet-manager";

const builtIn = [
    {
        name: "example",
        api: new ExampleTradeApi(),
        mtc: new ExampleMTC({
                id: "exex-id",
                asset: {market_id: "exex-coin-market-id", mint: "0x0f0f0f0f0f0f0f0f", symbol: "ex-ex"},
            }),
        stc: new ExampleSTC("IDLE", { publicKey: "0x0f0f0f0f0f0f0f0f", secretKey: "0x0f0f0f0f0f0f0f0f" }, new ExampleTradeApi()),
        walletManager: new SolanaWalletManager("")
    }
]

export interface IBaseImpl {
    readonly name: string
    readonly api: BaseTradeApi<any, any>
    readonly mtc: MasterTraderCtrl<any, any, any>
    readonly stc: SlaveTraderCtrl<any, any, any>
    readonly walletManager: BaseWalletManager
}

export class ImplRegistry {
    private impls: Array<IBaseImpl> = new Array()
    public static __instance: ImplRegistry

    private constructor() {
        log.echo(`ImplRegistry::constructor() loading built-in impls: ${builtIn.map(i => i.name).join(", ")}`)
        for (const i of builtIn) {
            this.register(i)
        }
    }

    public static get Instance() {
        return this.__instance || (this.__instance = new this())
    }

    register({ name, api, mtc, stc, walletManager }: IBaseImpl) {
        this.impls.push({ name, api, mtc, stc, walletManager })
    }

    get(name: string) {
        return this.impls.find(i => i.name === name)
    }

    has(name: string) {
        return !!this.get(name)
    }

    avaliable() {
        return this.impls.map(i => i.name)
    }
}
