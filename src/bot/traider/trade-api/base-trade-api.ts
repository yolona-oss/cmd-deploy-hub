import { Identificable } from "types/identificable";
import { IBalanceList } from "../types/balance";
import { IAssetInfo, IBaseTradeAsset } from "../types/asset";
import { IDEXWallet } from "../types/wallet";
import { ISimpleOffer, IPlatformResponce, IOffer } from "../types/trade";
import { IClonable } from "types/clonable";

export abstract class BaseTradeApi<AssetType extends IBaseTradeAsset = IBaseTradeAsset, TxRes = never> implements Identificable, IClonable {
    constructor(public readonly id: string) {}

    abstract clone(): any

    abstract assetInfo(asset: AssetType): Promise<IAssetInfo>;
    abstract balance(traider: Omit<IDEXWallet, "secretKey">): Promise<IBalanceList>;
    abstract buy(opt: IOffer<AssetType>): Promise<IPlatformResponce<TxRes>>;
    abstract sell(opt: IOffer<AssetType>): Promise<IPlatformResponce<TxRes>>;

    abstract ordersForAsset(asset: AssetType): Promise<{
        bids: ISimpleOffer[]
        asks: ISimpleOffer[]
    }>

    abstract createTraider(wallet: Omit<IDEXWallet, "secretKey">): Promise<IDEXWallet> 
    abstract addBalance(src: IDEXWallet, dst: Omit<IDEXWallet, "secretKey">, count: number): Promise<void>
    abstract createAsset(asset: AssetType, supply: number): Promise<void>
}
