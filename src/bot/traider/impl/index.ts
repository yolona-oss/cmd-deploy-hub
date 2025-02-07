import { MasterTraderCtrl } from "../mtc";
import { SlaveTraderCtrl } from "../stc";
import { BaseTradeApi } from "../trade-api/base-trade-api";

import { ExampleSTC, ExampleMTC } from "./example/workers";
import { ExampleTradeApi } from "./example/api";

import log from "utils/logger";

const builtIn = [
    {
        name: "example",
        api: ExampleTradeApi,
        mtc: ExampleMTC,
        stc: ExampleSTC
    }
]

export interface BaseImpl {
    name: string
    api: BaseTradeApi<any, any>
    mtc: MasterTraderCtrl<any, any, any>
    stc: SlaveTraderCtrl<any, any, any>
}

export class ImplRegistry {
    private impls: Array<BaseImpl> = new Array()
    public static _instance: ImplRegistry

    private constructor() {
        log.echo(`ImplRegistry::constructor() loading built-in impls: ${builtIn.map(i => i.name).join(", ")}`)
    }

    public static get Instance() {
        return this._instance || (this._instance = new this())
    }

    register(name: string, api: BaseTradeApi<any, any>, mtc: MasterTraderCtrl<any, any, any>, stc: SlaveTraderCtrl<any, any, any>) {
        this.impls.push({ name, api, mtc, stc })
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
