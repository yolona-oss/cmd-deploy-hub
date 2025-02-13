import { BaseTradeApi } from "../../trade-api/base-trade-api";
import { IDEXWallet, IBalanceList, IOffer, ISimpleOffer } from "../../types"
import { IPlatformResponce } from "../../types/trade"
import { IAssetInfo } from "../../types/asset"
import { HttpClient } from "utils/network/http-client";
import { getInitialConfig } from "config";
import { ExExAssetType } from "./asset-type";
import { genRandomNumberBetween } from "utils/random";

export const MAIN_TOKEN_NAME = "exex-coin"


export class ExampleTradeApi extends BaseTradeApi<ExExAssetType> {
    constructor(_?: string) {
        super("example-trade-api");
    }

    clone() {
        return new ExampleTradeApi()
    }

    async assetInfo(asset: ExExAssetType): Promise<IAssetInfo> {
        const cfg = getInitialConfig()
        const client = new HttpClient(cfg.server.uri + ":" + cfg.server.port + "/platform")
        return await client.get('/target-info/' + asset.market_id)
    }

    async balance(wallet: Omit<IDEXWallet, "secretKey">): Promise<IBalanceList<number>> {
        const cfg = getInitialConfig()
        const client = new HttpClient(cfg.server.uri + ":" + cfg.server.port + "/platform")

        const mainBalance = await client.get<number>('/traider-balance/' + wallet.publicKey)
        const assets = await client.get<{market_id: string, quantity: number}[]>('/traider-targets/' + wallet.publicKey)

        return [
            {
                currency: MAIN_TOKEN_NAME,
                balance: mainBalance
            }
        ].concat(assets.map(a => ({
            currency: a.market_id,
            balance: a.quantity
        })))
    }

    async buy(opt: IOffer<ExExAssetType>): Promise<IPlatformResponce> {
        const cfg = getInitialConfig()
        const client = new HttpClient(cfg.server.uri + ":" + cfg.server.port + "/platform")
        return await client.post('/place-buy', {
            traider: {
                wallet: opt.traider.wallet
            },
            tx: {
                price: opt.value.price,
                quantity: opt.value.quantity
            },
            market_id: opt.asset.market_id
        })
    }

    async sell(opt: IOffer<ExExAssetType>): Promise<IPlatformResponce> {
        const cfg = getInitialConfig()
        const client = new HttpClient(cfg.server.uri + ":" + cfg.server.port + "/platform")
        return await client.post('/place-sell', {
            traider: {
                wallet: opt.traider.wallet
            },
            tx: {
                price: opt.value.price,
                quantity: opt.value.quantity
            },
            market_id: opt.asset.market_id
        })
    }

    async ordersForAsset(target: ExExAssetType): Promise<{ bids: ISimpleOffer[], asks: ISimpleOffer[] }> {
        const cfg = getInitialConfig()
        const client = new HttpClient(cfg.server.uri + ":" + cfg.server.port + "/platform")
        return await client.get('/target-uncommited-trades/' + target.market_id)
    }

    async createTraider(wallet: Omit<IDEXWallet, "secretKey">): Promise<IDEXWallet> {
        const cfg = getInitialConfig()
        const client = new HttpClient(cfg.server.uri + ":" + cfg.server.port + "/platform")
        return await client.post<IDEXWallet>('/create-traider', {
            wallet: {
                publicKey: wallet.publicKey
            }
        })
    }

    async addBalance(_: IDEXWallet, dst: Omit<IDEXWallet, "secretKey">, count: number): Promise<void> {
        const cfg = getInitialConfig()
        const client = new HttpClient(cfg.server.uri + ":" + cfg.server.port + "/platform")
        return await client.post('/dev-update-balance', {
            dst: { publicKey: dst.publicKey },
            amount: count
        })
    }

    async createAsset(asset: ExExAssetType, supply: number): Promise<void> {
        const cfg = getInitialConfig()
        const client = new HttpClient(cfg.server.uri + ":" + cfg.server.port + "/platform")
        return await client.post('/create-target', {
            market_id: asset.market_id,
            mint: asset.mint,
            symbol: asset.symbol,
            supply: supply,
            initialPrice: Number(genRandomNumberBetween(1, 100).toFixed(1))
        })
    }
}
