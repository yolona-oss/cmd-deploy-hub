import { EventEmitter } from "events"
import { BaseTradeApi } from "./trade-api/base-trade-api"
import { TradeSideConst, TradeSideType, IOffer } from "./types/trade"
import { IDEXWallet } from "./types/wallet"
import { ITraider } from "./types"
import { IBaseTradeAsset } from "./types/asset"
import { ICommand } from "types/command"

import log from 'utils/logger'

export interface ICmdPushOfferOpts<TradeAsset extends IBaseTradeAsset = IBaseTradeAsset> {
    trade: Omit<IOffer<TradeAsset>, "traider">
    exe?: {
        declineIf?: (wallet: IDEXWallet, trade: Omit<IOffer<TradeAsset>, "traider">) => Promise<boolean>
        declineCascade?: boolean
    }
    setup?: {
        delay?: number,
        retries?: number,
        timeout?: number
    }
}

export class OfferCmd<TradeAsset extends IBaseTradeAsset = IBaseTradeAsset> extends EventEmitter implements ICommand<void> {
    private id: string
    private api: BaseTradeApi<TradeAsset, any>
    private cmd_opt: ICmdPushOfferOpts<TradeAsset>
    private traider: ITraider
    private side: TradeSideType

    constructor(config: {
        id: string,
        api: BaseTradeApi<TradeAsset, any>,
        opt: ICmdPushOfferOpts<TradeAsset>,
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
        const { asset, value: tx } = trade
        const { exe } = this.cmd_opt
        const id = this.id

        const offerFn = this.side === TradeSideConst.Buy ? this.api.buy : this.api.sell

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
            asset,
            side: TradeSideConst.Sell,
            value: tx,
            result
        }

        this.emit("Done", id, mappedTx, performance.now() - start)
    }
}
