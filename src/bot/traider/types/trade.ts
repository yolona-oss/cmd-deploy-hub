import { Range } from "types/range";
import { ITraider } from "./traider";
import { IBaseTradeTarget } from "./trade-target";
import { DEXWallet } from "./wallet";

export interface Trade<TradeTarget extends IBaseTradeTarget = IBaseTradeTarget, ResponceData = never> {
    target: TradeTarget;
    value: ITradeTargetValue;
    side: TradeSideType;
    result: IPlatformResponce<ResponceData>;
    time: number;
}

export const TradeSide = {
    Buy: "BUY",
    Sell: "SELL"
}

export type TradeSideType = typeof TradeSide[keyof typeof TradeSide]

export type ITradeTargetValue<T = number> = { quantity: T, price: T }

export interface IPlatformResponce<ResponceData = never> {
    signature: string;
    error?: unknown;
    data?: ResponceData;
    success: boolean;
}

export interface ITradeOrder {
    from: ITraider;
    price: number;
    quantity: number;
}

export interface TradeOffer<TradeTarget extends IBaseTradeTarget = IBaseTradeTarget> {
    traider: ITraider,
    target: TradeTarget,
    tx: ITradeTargetValue,
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
            initiator: Omit<DEXWallet, "secretKey">,
            tx: ITradeTargetValue,
            side: TradeSideType,
            txData: TxData
        }[]
        overallTxCount: number
    } & Range>
}
