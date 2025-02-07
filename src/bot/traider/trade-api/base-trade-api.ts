import { Identificable } from "types/identificable";
import { IPlatformResponce, TradeOffer, ITargetInfo, IBalance, DEXWallet, IBaseTradeTarget } from "../types";
import { ITradeOrder } from "../types/trade";

export abstract class BaseTradeApi<TargetType extends IBaseTradeTarget = IBaseTradeTarget, TxRes = never> implements Identificable {
    constructor(public readonly id: string) {}

    abstract clone(): any

    /*** @description Get info about trading target */
    abstract targetInfo(target: TargetType): Promise<ITargetInfo>;

    /*** @description Get balance of passed account */
    abstract balance(traider: Omit<DEXWallet, "secretKey">): Promise<IBalance>;

    abstract buy(opt: TradeOffer<TargetType>): Promise<IPlatformResponce<TxRes>>;

    abstract sell(opt: TradeOffer<TargetType>): Promise<IPlatformResponce<TxRes>>;

    abstract ordersForTarget(target: TargetType): Promise<{
        bids: ITradeOrder[]
        asks: ITradeOrder[]
    }>

    abstract createTraider(wallet: Omit<DEXWallet, "secretKey">): Promise<DEXWallet> 
    abstract addBalance(src: DEXWallet, dst: Omit<DEXWallet, "secretKey">, count: number): Promise<void>
    abstract createTarget(target: TargetType, supply: number): Promise<void>
}
