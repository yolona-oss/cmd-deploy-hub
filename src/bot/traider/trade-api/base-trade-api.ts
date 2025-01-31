import { Identificable } from "types/identificable";
import { ITradeTxResult, TradeOffer, ITargetInfo, IBalance } from "../types";

export abstract class BaseTradeApi<WalletType, TxRes> implements Identificable {
    constructor(public readonly id: string) {}

    /*** @description Get info about trading target */
    abstract TargetInfo(target: string): Promise<ITargetInfo>;

    /*** @description Get balance of passed account */
    abstract Balance(traider: WalletType): Promise<IBalance>;

    abstract buy(opt: TradeOffer<WalletType>): Promise<ITradeTxResult<TxRes>>;

    abstract sell(opt: TradeOffer<WalletType>): Promise<ITradeTxResult<TxRes>>;
}
