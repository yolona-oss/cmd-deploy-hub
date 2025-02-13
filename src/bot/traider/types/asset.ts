import { ITradeSupply, TradeSideType } from "./trade";
import { IDEXWallet } from "./wallet";

export interface IBaseTradeAsset {
    market_id: string
    symbol: string
}

export interface IBaseDEXTradeAsset extends IBaseTradeAsset {
    mint: string
}

export interface IAssetInfo<TxData = never> {
    marketCap: number;
    tradesVolume: number;
    price: number;
    supply: number;
    holders: number;
    trades: (range: Range) => Promise<{
        trades: {
            time: number,
            initiator: Omit<IDEXWallet, "secretKey">,
            tx: ITradeSupply,
            side: TradeSideType,
            txData: TxData
        }[]
        overallTxCount: number
    } & Range>
}
