import { BaseTradeApi } from "../../trade-api/base-trade-api";
import { DEXWallet, TradeOffer } from "../../types"
import { ITargetInfo, ITradeOrder, IPlatformResponce } from "../../types/trade"
import { HttpClient } from "utils/network/http-client";
import { getInitialConfig } from "config";
import { ExExTargetType } from "./target-type";

export class ExampleTradeApi extends BaseTradeApi<ExExTargetType> {
    constructor(url?: string) {
        super("example-trade-api");
    }

    clone() {
        return new ExampleTradeApi()
    }

    async targetInfo(target: ExExTargetType): Promise<ITargetInfo> {
        const cfg = getInitialConfig()
        const client = new HttpClient(cfg.server.uri + ":" + cfg.server.port + "/platform")
        return await client.get('/target-info/' + target.market_id)
    }

    async balance(wallet: Omit<DEXWallet, "secretKey">): Promise<number> {
        const cfg = getInitialConfig()
        const client = new HttpClient(cfg.server.uri + ":" + cfg.server.port + "/platform")
        const res = await client.get<number>('/traider-balance/' + wallet.publicKey)
        return res
    }

    async buy(opt: TradeOffer<ExExTargetType>): Promise<IPlatformResponce> {
        const cfg = getInitialConfig()
        const client = new HttpClient(cfg.server.uri + ":" + cfg.server.port + "/platform")
        return await client.post('/place-buy', opt)
    }

    async sell(opt: TradeOffer<ExExTargetType>): Promise<IPlatformResponce> {
        const cfg = getInitialConfig()
        const client = new HttpClient(cfg.server.uri + ":" + cfg.server.port + "/platform")
        return await client.post('/place-sell', opt)
    }

    async ordersForTarget(target: ExExTargetType): Promise<{ bids: ITradeOrder[], asks: ITradeOrder[] }> {
        const cfg = getInitialConfig()
        const client = new HttpClient(cfg.server.uri + ":" + cfg.server.port + "/platform")
        return await client.get('/target-uncommited-trades/' + target.market_id)
    }

    async createTraider(wallet: Omit<DEXWallet, "secretKey">): Promise<DEXWallet> {
        const cfg = getInitialConfig()
        const client = new HttpClient(cfg.server.uri + ":" + cfg.server.port + "/platform")
        return await client.post<DEXWallet>('/create-traider', {wallet: wallet})
    }

    async addBalance(_: DEXWallet, dst: Omit<DEXWallet, "secretKey">, count: number): Promise<void> {
        const cfg = getInitialConfig()
        const client = new HttpClient(cfg.server.uri + ":" + cfg.server.port + "/platform")
        return await client.post('/dev-update-balance', {dst: { publicKey: dst.publicKey }, amount: count})
    }

    async createTarget(target: ExExTargetType, supply: number): Promise<void> {
        const cfg = getInitialConfig()
        const client = new HttpClient(cfg.server.uri + ":" + cfg.server.port + "/platform")
        return await client.post('/create-target', {market_id: target.market_id, mint: target.mint, symbol: target.symbol, supply: supply})
    }
}
