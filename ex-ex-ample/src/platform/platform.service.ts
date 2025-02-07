import { OrderBook } from "./order-book";
import { ITargetInfo, ITradeTxType, Range, Trade, TradeOffer, TradeSide, TradeSideType } from "./types";

import { PlatformTraiderDocument } from "./schemas/traider.schema";
import { PlatformTargetDocument } from "./schemas/target.schema";
import { BadRequestException, Injectable } from "@nestjs/common";
import { Model } from "mongoose";
import { PlatformTradeDocument } from "./schemas/trades.schema";
import { InjectModel } from "@nestjs/mongoose";

interface ExampleTxResData {

}

@Injectable()
export class PlatformService {
    private orderBooks: Map<string, OrderBook> = new Map()

    constructor(
        @InjectModel('PlatformTraider')
        private readonly traiders: Model<PlatformTraiderDocument>,
        @InjectModel('PlatformTrade')
        private readonly trades: Model<PlatformTradeDocument>,
        @InjectModel('PlatformTarget')
        private readonly targets: Model<PlatformTargetDocument>,
    ) {
        this.targets.find().then(targets => {
            targets.forEach(t => {
                const ob = new OrderBook()
                ob.on("change", async (d: any) => await this.onOrderBookChange.bind(this)(d, t.market_id, t.symbol))
                this.orderBooks.set(t.market_id, ob)
            })
        })
    }

    async createTarget(market_id: string, mint: string, symbol: string, supply: number) {
        await this.targets.create({ market_id, mint, symbol, supply, circulating: 0 })

        const ob = new OrderBook
        ob.on("change", async (d: any) => await this.onOrderBookChange.bind(this)(d, market_id, symbol))

        this.orderBooks.set(market_id, ob)
    }

    async removeTarget(market_id: string) {
        const res = await this.targets.deleteMany({market_id})
        if (res.deletedCount === 0) {
            throw new BadRequestException("Target not found")
        }
        this.orderBooks.delete(market_id)
    }

    async createTraider(wallet: { publicKey: string }) {
        const secretKey = crypto.randomUUID()

        const exists = await this.traiders.findOne({'walletData.publicKey': wallet.publicKey})
        if (exists) {
            return {
                publicKey: exists.walletData.publicKey,
                secretKey: exists.walletData.secretKey,
                alreadyExists: true
            }
        }

        await this.traiders.create({ walletData: {
            publicKey: wallet.publicKey,
            secretKey
        }, balance: 0 })
        return { publicKey: wallet.publicKey, secretKey }
    }

    async getTraderCommitedTrades(wallet: { publicKey: string }) {
        const id = await this.traiders.findOne({'walletData.publicKey': wallet.publicKey})
        return await this.trades.find({
            initiator: id
        })
    }

    async getTraiderWaitingTraides(wallet: { publicKey: string }) {
        let res = new Map<string, {sells: any[], buys: any[]}> 
        for (const ob of this.orderBooks.entries()) {
            res = res.set(ob[0], ob[1].getTraiderOrders(wallet))
        }
        return res
    }

    async getTraiderBalance(wallet: { publicKey: string }) {
        const traider = await this.traiders.findOne({'walletData.publicKey': wallet.publicKey})
        if (!traider) {
            throw new BadRequestException("Traider " + wallet.publicKey + " not exists")
        }
        return traider.balance
    }

    async getTraiders() {
        return await this.traiders.find()
    }

    async getTargets() {
        return await this.targets.find()
    }

    async getTargetHolders(target: string) {
        const traiders = await this.getTraiders()

        let i = 0
        for (const traider of traiders) {
            const targets = await this.getTraiderTargets(traider.walletData)
            for (const _target of targets) {
                if (_target.target === target) {
                    i++
                    break
                }
            }
        }
        return i
    }

    async getTraiderTargets(wallet: { publicKey: string }): Promise<{
        target: string,
        quantity: number
    }[]> {
        const traider = await this.traiders.findOne({'walletData.publicKey': wallet.publicKey})
        if (!traider) {
            return []
        }
        return await this.equalizeTrades(await this.trades.find({initiator: traider.id}))
    }

    private async equalizeTrades(trades: Trade<ExampleTxResData>[]): Promise<{
        target: string,
        quantity: number
    }[]> {
        const mergePrices = (trades: Trade<ExampleTxResData>[]) => {
            const priceMerged: {price: number, quantity: number}[] = []
            for (const trade of trades) {
                let entry = priceMerged.find(item => item.price === Number(trade.value.price))
                if (entry) {
                    entry.quantity += Number(trade.value.quantity)
                } else {
                    priceMerged.push({ price: Number(trade.value.price), quantity: Number(trade.value.quantity) })
                }
            }
            return priceMerged
        }

        const allTargets = await this.getTargets()
        let res: any = []
        for (const target_l of allTargets) {
            const buys = trades.filter(t => t.side === TradeSide.Buy && t.target.market_id === target_l.market_id && t.result.success)
            const sells = trades.filter(t => t.side === TradeSide.Sell && t.target.market_id === target_l.market_id && t.result.success)

            const buy = mergePrices(buys)
            const sell = mergePrices(sells)

            let entry = {
                target: target_l,
                quantity: 0
            }
            for (let i = 0; i < buy.length; i++) {
                const b = buy[i]
                const s = sell.find(s => s.price === b.price)
                if (s) {
                    entry.quantity += b.quantity - s.quantity
                } else {
                    entry.quantity += b.quantity
                }
            }

            res.push(entry)
        }

        return res
    }

    async placeSell(trade: TradeOffer) {
        const target = trade.target

        try {
            if (!this.orderBooks.has(target.market_id)) {
                throw new BadRequestException(`Target ${target.market_id} not exists`)
            }

            const traider = await this.traiders.findOne({'walletData.publicKey': trade.traider.wallet.publicKey})
            if (!traider) {
                throw new BadRequestException("Traider not exists")
            }

            const traiderTarget = (await this.getTraiderTargets(trade.traider.wallet))
                .find(t => t.target === trade.target.market_id)

            if (traiderTarget && traiderTarget.quantity < trade.tx.quantity) {
                throw new BadRequestException(`Not enough targets: "${trade.target}" in traider wallet`)
            }

            this.orderBooks.get(target.market_id)!.addSell(
                trade.traider.wallet,
                Number(trade.tx.price),
                Number(trade.tx.quantity)
            )

            return {
                success: true
            }
        } catch (e) {
            return {
                success: false,
                error: e
            }
        }
    }

    async placeBuy(trade: TradeOffer) {
        const balance = await this.getTraiderBalance(trade.traider.wallet)
        const target = trade.target

        if (balance && balance >= trade.tx.price * trade.tx.quantity) {
            console.log(this.orderBooks)
            if (!this.orderBooks.has(target.market_id)) {
                throw new BadRequestException(`Target ${trade.target} not exists`)
            }

            this.orderBooks.get(target.market_id)!.addBuy(trade.traider.wallet, Number(trade.tx.price), Number(trade.tx.quantity))
            return {
                success: true
            }
        }
        return {
            success: false,
            error: "Not enough balance or user not exists or target not exists"
        }
    }

    async addBalance(wallet: { publicKey: string }, count: number) {
        await this.traiders.updateOne({'walletData.publicKey': wallet.publicKey}, {$inc: {balance: count}})
    }

    async tradesOverTarget(target: string) {
        const _target = await this.targets.findOne({market_id: target})

        if (!_target) {
            throw new BadRequestException("Target not found")
        }

        return await this.trades.find({target: _target.id})
    }

    async uncommitedTradesOverTarget(target: string) {
        if (!this.orderBooks.has(target)) {
            throw new BadRequestException("Target not exists")
        }
        return {
            bids: this.orderBooks.get(target)!.getBids(),
            asks: this.orderBooks.get(target)!.getAsks()
        }
    }

    public async getTargetPrice(target: string) {
        const bid = this.orderBooks.get(target)?.getBestBuy()
        if (bid) {
            return bid.price
        } else {
            const tot = (await this.tradesOverTarget(target)).filter(i => i.side === TradeSide.Buy)
            return tot.length > 0 ? Number(tot[tot.length - 1].value.price) : 0
        }
    }

    private async mapTradesInfo(target: string, range: Range): Promise<{
        trades: {
            time: number,
            initiator: string,
            tx: ITradeTxType<number>,
            side: TradeSideType,
            txData: never,
        }[],
        overallTxCount: number,
        limit: number
        offset: number
    }> {
        let res: any = {
            trades: [],
            overallTxCount: 0,
            ...range
        }
        const isInRange = (time: number) => {
            return time >= range.offset && time <= range.limit
        }

        const tot = await this.tradesOverTarget(target)
        if (!tot) {
            return res
        }

        res.trades = tot.filter(t => isInRange(t.time)).map(t => ({
            time: t.time,
            initiator: t.initiator,
            tx: {
                price: t.value.price,
                quantity: t.value.quantity
            },
            side: t.side,
            txData: t
        }))
        res.overallTxCount = tot.length

        return res
    }

    public async getTargetInfo(target: string): Promise<ITargetInfo | undefined> {
        const targetObj = await this.targets.findOne({market_id: target})

        if (!targetObj) {
            throw new BadRequestException("Target not found")
        }

        return {
            MC: await this.getTargetPrice(target) * targetObj.circulating,
            Volume: targetObj.circulating,
            CurPrice: await this.getTargetPrice(target),
            CurSupply: targetObj.supply,
            Holders: await this.getTargetHolders(target),
            trades: async (range: Range) => this.mapTradesInfo(target, range),
        }
    }

    private async onOrderBookChange(data: {
        side: TradeSideType,
        fromWallet: { publicKey: string },
        price: number,
        diff: number
    }, target: string, symbol: string) {
        if (data.side === TradeSide.Buy) {
            await this.addBalance(data.fromWallet, data.diff * data.price)
        } else {
            await this.addBalance(data.fromWallet, -(data.diff * data.price))
        }

        // TODO: this is not the best way to update the target circulating supply
        //       just increases in each commited trade:)
        await this.targets.updateOne({market_id: target}, {$inc: {circulating: data.diff}})

        const target_id = (await this.targets.findOne({market_id: target}))!.id
        await this.trades.create({
            time: Date.now(),
            target: target_id,
            initiator: (await this.traiders.findOne({'walletData.publicKey': data.fromWallet.publicKey}))!.id,
            side: data.side,
            value: {
                price: data.price,
                quantity: data.diff
            },
            symbol,
            result: {
                success: true
            }
        })
    }
}
