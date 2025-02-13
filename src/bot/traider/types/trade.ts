import { IBaseTradeAsset } from "./asset";
import { ITraider } from "./traider";

export const TradeSideConst = {
    Buy: "BUY",
    Sell: "SELL"
}
export type TradeSideType = typeof TradeSideConst[keyof typeof TradeSideConst]

export type ITradeSupply<T extends number|bigint = number> = { quantity: T, price: T }

export interface IPlatformResponce<ResponceData = never> {
    success: boolean;
    signature: string;
    fee: number;

    error?: unknown;
    data?: ResponceData;
}

export interface ITradeCommit<TradeAsset extends IBaseTradeAsset = IBaseTradeAsset, ResponceData = never> {
    asset: TradeAsset;
    value: ITradeSupply;
    side: TradeSideType;
    result: IPlatformResponce<ResponceData>;
    time: number;
}

export interface IOffer<TradeAsset extends IBaseTradeAsset = IBaseTradeAsset> {
    traider: ITraider,
    asset: TradeAsset,
    value: ITradeSupply,
    slippage?: number,
    fee?: any,
}

export interface ISimpleOffer {
    from: ITraider;
    price: number;
    quantity: number;
}
