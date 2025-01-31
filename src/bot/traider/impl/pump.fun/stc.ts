import { SlaveTraderCtrl } from "bot/traider/stc";
import { PumpFunTradeApi, WalletData } from "bot/traider/trade-api/pump.fun";

export class PumpFunSTC extends SlaveTraderCtrl<PumpFunTradeApi, WalletData, any> {
    constructor(
        wallet: WalletData,
    ) {
        super(new PumpFunTradeApi(), wallet)
    }
}
