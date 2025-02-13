import { OrderBook } from "./order-book";
import { ITargetInfo, ITradeTxType, Range, Trade, TradeOffer, TradeSide, TradeSideType } from "./types";

import { PlatformTraiderDocument } from "./schemas/traider.schema";
import { PlatformTargetDocument } from "./schemas/target.schema";
import { BadRequestException, Injectable } from "@nestjs/common";
import { Model } from "mongoose";
import { PlatformTradeDocument, PlatformTradeEntity } from "./schemas/trades.schema";
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
        (async () => {
            const targets = await this.targets.find()
            for (const trgt of targets) {
                const ob = new OrderBook()
                ob.on("change", async (d: any) => await this.onOrderBookChange.bind(this)(d, trgt.market_id, trgt.symbol))
                this.orderBooks.set(trgt.market_id, ob)

                const trgtCreator = await this.traiders.findById(trgt.creator_id)
                const creatorTokenBalance = await this.getTraiderTargets(trgtCreator!.walletData)
                for (const tokenV of creatorTokenBalance) {
                    if (tokenV.market_id === trgt.market_id) {
                        const initIPOSupply = trgt.supply/2
                        const traidersTargetSupply = await this.getTraidersTargetSupply(trgt.market_id)
                        const avalibleSupply = initIPOSupply - traidersTargetSupply
                        if (avalibleSupply > 0) {
                            ob.addSell(trgtCreator!.walletData, trgt.ipoInitialPrice, avalibleSupply)
                        }
                    }
                }
            }
        })()
    }

    async tmp() {
        const traiders = await this.traiders.find()
        for (const traider of traiders) {
            console.log(traider.walletData, await this.getTraiderTargets(traider.walletData))
        }
    }

    async dropAll() {
        await this.traiders.deleteMany({})
        await this.targets.deleteMany({})
        await this.trades.deleteMany({})
    }

    async createTarget(market_id: string, mint: string, symbol: string, supply: number, initialPrice: number) {
        if (await this.targets.findOne({market_id})) {
            throw new BadRequestException(`Target ${market_id} already exists`)
        }

        const ipo = await this.traiders.create({
            balance: initialPrice * supply,
            walletData: {
                publicKey: "IPO_" + crypto.randomUUID(),
                secretKey: crypto.randomUUID()
            },
            isIPO: true
        })

        const t = await this.targets.create({ market_id, mint, symbol, supply, circulating: 0, creator_id: ipo.id, ipoInitialPrice: initialPrice })

        const ob = new OrderBook
        ob.on("change", async (d: any) => await this.onOrderBookChange.bind(this)(d, market_id, symbol))
        this.orderBooks.set(market_id, ob)

        //await this.placeBuy({
        //    tx: {
        //        price: initialPrice,
        //        quantity: supply
        //    },
        //    target: t,
        //    traider: {
        //        wallet: ipo.walletData
        //    }
        //}, true)
        //await this.placeSell({
        //    tx: {
        //        price: initialPrice,
        //        quantity: supply/2
        //    },
        //    target: t,
        //    traider: {
        //        wallet: ipo.walletData
        //    }
        //})

        await this.trades.create({
            initiator_id: ipo.id,
            target_id: t.id,
            value: {
                price: initialPrice,
                quantity: supply
            },
            side: TradeSide.Buy,
            result: { success: true, signature: "IPO_"+Math.random().toString(8) },
            time: Date.now()
        })

        await this.trades.create({
            initiator_id: ipo.id,
            target_id: t.id,
            value: {
                price: initialPrice,
                quantity: supply/2
            },
            side: TradeSide.Sell,
            result: { success: true, signature: "IPO_"+Math.random().toString(8) },
            time: Date.now()
        })

        ob.addSell(ipo.walletData, initialPrice, supply/2)
    }

    async removeTarget(market_id: string) {
        const res = await this.targets.deleteMany({market_id})
        if (res.deletedCount === 0) {
            throw new BadRequestException(`Target ${market_id} not found`)
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
        const traider = await this.traiders.findOne({'walletData.publicKey': wallet.publicKey})

        if (!traider) {
            throw new BadRequestException("Traider " + wallet.publicKey + " not exists")
        }

        return await this.trades.find({
            initiator_id: traider.id
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

    async getTraiders(exclude_ipo = false) {
        if (exclude_ipo) {
            return await this.traiders.find({isIPO: false})
        }
        return await this.traiders.find()
    }

    async getTargets() {
        return await this.targets.find()
    }

    async getTargetHolders(market_id: string) {
        const traiders = await this.getTraiders()

        const holders: { traider_id: number, quantity: number }[] = []
        for (const traider of traiders) {
            const targets = await this.getTraiderTargets(traider.walletData)
            for (const target of targets) {
                if (target.market_id === market_id && target.quantity > 0) {
                    holders.push({ traider_id: traider.id, quantity: target.quantity })
                    break
                }
            }
        }
        return holders
    }

    async getTraidersTargetSupply(market_id: string) {
        const traiders = await this.getTraiders(true)
        let quantity = 0
        for (const traider of traiders) {
            const targets = await this.getTraiderTargets(traider.walletData)
            for (const target of targets) {
                if (target.market_id === market_id) {
                    quantity += target.quantity
                }
            }
        }
        return quantity
    }

    async getTraiderTargets(wallet: { publicKey: string }): Promise<{
        market_id: string,
        quantity: number
    }[]> {
        const traider = await this.traiders.findOne({'walletData.publicKey': wallet.publicKey})
        if (!traider) {
            throw new BadRequestException("Traider " + wallet.publicKey + " not exists")
        }
        return await this.equalizeTrades(traider.id)
    }

    private async equalizeTrades(intiator_id: string): Promise<{
        market_id: string,
        quantity: number
    }[]> {
        const mergePrices = (trades: PlatformTradeEntity[]) => {
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
        let res: {market_id: string, quantity: number}[] = []
        for (const target_l of allTargets) {
            const buys = await this.trades.find({
                initiator_id: intiator_id,
                side: TradeSide.Buy,
                target_id: target_l.id,
                'result.success': true
            })
            const sells = await this.trades.find({
                initiator_id: intiator_id,
                side: TradeSide.Sell,
                target_id: target_l.id,
                'result.success': true
            })

            const buy = mergePrices(buys)
            const sell = mergePrices(sells)

            let entry = {
                market_id: target_l.market_id,
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
        const t_market_id = trade.market_id

        try {
            if (!this.orderBooks.has(t_market_id)) {
                throw new BadRequestException(`Target ${t_market_id} not exists`)
            }

            const traider = await this.traiders.findOne({'walletData.publicKey': trade.traider.wallet.publicKey})
            if (!traider) {
                throw new BadRequestException("Traider not exists")
            }

            const traiderTarget = (await this.getTraiderTargets(trade.traider.wallet))
            .find(t => t.market_id === t_market_id)

            if (traiderTarget && traiderTarget.quantity < trade.tx.quantity) {
                throw new BadRequestException(`Not enough targets: "${t_market_id}" in traider wallet`)
            }

            this.orderBooks.get(t_market_id)!.addSell(
                trade.traider.wallet,
                trade.tx.price,
                trade.tx.quantity
            )

            return {
                signature: crypto.randomUUID(),
                success: true
            }
        } catch (e) {
            return {
                signature: crypto.randomUUID(),
                success: false,
                error: e
            }
        }
    }

    async placeBuy(trade: TradeOffer, isIPO = false) {
        const balance = await this.getTraiderBalance(trade.traider.wallet)
        const t_market_id = trade.market_id

        const targetData = await this.getTargetInfo(t_market_id)

        if (!targetData) {
            throw new BadRequestException(`Target ${t_market_id} not exists`)
        }

        const avalibleQuantity = await this.avalibleTargetSupply(t_market_id)
        if (!isIPO && trade.tx.quantity > avalibleQuantity) {
            throw new BadRequestException(`Target ${t_market_id} not enough supply`)
        }

        if (balance && balance >= trade.tx.price * trade.tx.quantity) {
            if (!this.orderBooks.has(t_market_id)) {
                throw new BadRequestException(`Target ${t_market_id} not exists`)
            }

            this.orderBooks.get(t_market_id)!.addBuy(trade.traider.wallet, Number(trade.tx.price), Number(trade.tx.quantity))
            return {
                signature: crypto.randomUUID(),
                success: true
            }
        }
        return {
            signature: crypto.randomUUID(),
            success: false,
            error: "Not enough balance or user not exists or target not exists"
        }
    }

    async addBalance(wallet: { publicKey: string }, count: number) {
        await this.traiders.updateOne({'walletData.publicKey': wallet.publicKey}, {$inc: {balance: Number(count)}})
    }

    async tradesOverTarget(market_id: string) {
        const target = await this.targets.findOne({market_id})

        if (!target) {
            throw new BadRequestException(`Target ${market_id} not found`)
        }

        return await this.trades.find({target_id: target.id})
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

    public async avalibleTargetSupply(market_id: string) {
        const target = await this.targets.findOne({market_id})

        if (!target) {
            throw new BadRequestException(`Target ${market_id} not found`)
        }

        const traiders = await this.traiders.find()
        let supply = target.supply

        for (const traider of traiders) {
            const holders = await this.getTraiderTargets(traider.walletData)
            const quantity = holders.find(h => h.market_id === target.market_id)?.quantity || 0
            supply -= quantity
        }

        return supply
    }

    private async mapTradesInfo(market_id: string, range: Range): Promise<{
        trades: {
            time: number,
            initiator_id: string,
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

        const tot = await this.tradesOverTarget(market_id)
        if (!tot) {
            return res
        }

        res.trades = tot.filter(t => isInRange(t.time)).map(t => ({
            time: t.time,
            initiator_id: t.initiator_id,
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

    public async getTargetInfo(market_id: string): Promise<ITargetInfo | undefined> {
        const targetObj = await this.targets.findOne({market_id})

        if (!targetObj) {
            throw new BadRequestException(`Target ${market_id} not found`)
        }

        return {
            MC: await this.getTargetPrice(market_id) * targetObj.circulating,
            Volume: targetObj.circulating,
            CurPrice: await this.getTargetPrice(market_id),
            CurSupply: targetObj.supply,
            Holders: (await this.getTargetHolders(market_id)).length,
            trades: async (range: Range) => this.mapTradesInfo(market_id, range),
        }
    }

    private async onOrderBookChange(data: {
        side: TradeSideType,
        fromWallet: { publicKey: string },
        price: number,
        diff: number // qunantity of tokens trades
    }, target: string, symbol: string) {

        console.log(`On: ${target}, From: ${data.fromWallet.publicKey}, Price: ${data.price}, Diff: ${data.diff}, Side: ${data.side}`)

        const tradeVolume = data.diff * data.price

        if (data.side === TradeSide.Buy) {
            await this.addBalance(data.fromWallet, -tradeVolume)
        } else {
            await this.addBalance(data.fromWallet, tradeVolume)
        }

        // TODO: this is not the best way to update the target circulating supply
        //       just increases in each commited trade:)
        //await this.targets.updateOne({market_id: target}, {$inc: {circulating: data.diff}})

        const target_id = (await this.targets.findOne({market_id: target}))!.id
        const initiator = await this.traiders.findOne({'walletData.publicKey': data.fromWallet.publicKey})
        await this.trades.create({
            time: Date.now(),
            target: target_id,
            initiator_id: initiator!.id,
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
