import { SlaveTraderCtrl } from "../../stc";
import { MasterTraderCtrl } from "../../mtc";
import { ExampleTradeApi, MAIN_TOKEN_NAME } from "./api";
import { ExExAssetType } from "./asset-type";
import { IDEXWallet, ITraider } from "bot/traider/types";
import { Sequalizer } from "utils/sequalizer";

export class ExampleSTC extends SlaveTraderCtrl<ExampleTradeApi, ExExAssetType, any> {
    constructor(
        id: string,
        wallet: IDEXWallet,
        api: ExampleTradeApi,
        sequalizer?: Sequalizer
    ) {
        super(id, api, wallet, MAIN_TOKEN_NAME, sequalizer)
    }

    override clone(id: string, traider: ITraider): SlaveTraderCtrl<ExampleTradeApi, ExExAssetType, any> {
        return new ExampleSTC(id, traider.wallet, this.tradeApi.clone(), this.sequalizer)
    }
}

export class ExampleMTC extends MasterTraderCtrl<ExampleTradeApi, ExExAssetType, any> {
    constructor(config:
        {
            id: string,
            asset: ExExAssetType,
            initialSalves?: Array<SlaveTraderCtrl<ExampleTradeApi, ExExAssetType, any>>
        }
    ) {
        super(
            config.asset,
            config.initialSalves ?? [],
            new ExampleTradeApi(),
            config.id
        )
    }

    override clone(id: string, asset: ExExAssetType, newSlaves?: Array<SlaveTraderCtrl<ExampleTradeApi, ExExAssetType, any>>): MasterTraderCtrl<ExampleTradeApi, ExExAssetType, any> {
        return new ExampleMTC({id, asset, initialSalves: newSlaves ?? []})
    }
}
