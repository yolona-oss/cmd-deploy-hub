import { Range } from "types/range";

export interface Trade<TxResType = any> {
    symbol: string;
    target: string;
    value: ITradeTxType;
    side: typeof TradeSide[keyof typeof TradeSide];
    /**
     * Transaction id if successful
     */
    result: ITradeTxResult<TxResType>
}

export function isTrade<TxResType>(obj: any): obj is Trade<TxResType> {
    return 'symbol' in obj && 'value' in obj && 'side' in obj && 'result' in obj
}

export const TradeSide = {
    Buy: "BUY",
    Sell: "SELL"
}

export type ITradeTxType = { quantity: bigint, price: bigint } // | number 

export interface ITradeTxResult<TxResType> {
    signature?: string;
    error?: unknown;
    results?: TxResType;
    success: boolean;
}

export interface TradeOffer<WalletType> {
    traider: WalletType,
    target: string,
    tx: ITradeTxType,
    slippage?: bigint,
    fee?: any,
}

export interface ITargetInfo<TxData = never> {
    MC: bigint;
    Volume: bigint;
    CurPrice: bigint;
    CurSupply: bigint;
    Holders: bigint;
    trades: (range: Range) => Promise<{
        trades: {
            time: number,
            initiator: string, // pubkey or something or non dex platform :D
            tx: ITradeTxType,
            side: typeof TradeSide[keyof typeof TradeSide],
            txData: TxData
        }[]
        overallTxCount: number
    } & Range>
}
