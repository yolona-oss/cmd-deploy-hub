import { ITarget } from "../schemas/target.schema";

export interface Range {
    limit: number,
    offset: number
}

export type ITradeTxType<T = number> = { quantity: T, price: T } // | number 

export interface ITradeTxResult<TxResType> {
    signature?: string;
    error?: unknown;
    results?: TxResType;
    success: boolean;
}

export interface Trade<TxResType = any> {
    market_id: string;
    value: ITradeTxType;
    side: TradeSideType,
    result: ITradeTxResult<TxResType>
    time: number
}

export interface TradeOffer {
    traider: {
        wallet: {
            publicKey: string,
            secretKey: string
        }
    },
    market_id: string,
    tx: ITradeTxType,
    slippage?: number,
    fee?: any,
}

export interface ITargetInfo<TxData = never> {
    MC: number;
    Volume: number;
    CurPrice: number;
    CurSupply: number;
    Holders: number;
    trades: (range: Range) => Promise<{
        trades: {
            time: number,
            initiator_id: string,
            tx: ITradeTxType,
            side: TradeSideType,
            txData: TxData
        }[]
        overallTxCount: number
    } & Range>
}

export const TradeSide = {
    Buy: "BUY",
    Sell: "SELL"
}

export type TradeSideType = typeof TradeSide[keyof typeof TradeSide]

export interface IOrderBookEntry {
    fromWallet: {
        publicKey: string
    },
    price: number,
    quantity: number
}

export interface ExampleTxResData {
    //closed: boolean
}

