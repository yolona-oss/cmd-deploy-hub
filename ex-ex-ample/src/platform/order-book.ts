import { EventEmitter } from '../common/misc/events';
import { TradeSideType, IOrderBookEntry, TradeSide } from "./types";

export class OrderBook extends EventEmitter<any> {
    private sells: IOrderBookEntry[] = [];
    private buys: IOrderBookEntry[] = [];

    constructor() {
        super()
    }

    public getTraiderOrders(wallet: { publicKey: string }) {
        return {
            sells: this.sells.filter(e => e.fromWallet.publicKey === wallet.publicKey),
            buys: this.buys.filter(e => e.fromWallet.publicKey === wallet.publicKey)
        }
    }

    public getBestSell(): IOrderBookEntry | undefined {
        return this.sells.sort((a, b) => a.price - b.price)[0]
    }

    public getBestBuy(): IOrderBookEntry | undefined {
        return this.buys.sort((a, b) => b.price - a.price)[0]
    }

    public getPrice(): number | undefined {
        return this.getBestSell()?.price || -1
    }

    public getBids() {
        return Object.assign({}, this.buys)
    }

    public getAsks() {
        return Object.assign({}, this.sells)
    }

    private processOrder(wallet: { publicKey: string }, side: TradeSideType, price: number, quantity: number) {
        let ob = side === TradeSide.Buy ? this.buys : this.sells
        let obInverse = side === TradeSide.Buy ? this.sells : this.buys

        const initalQuantity = quantity
        let entry = ob.find(e => e.price === price && e.fromWallet.publicKey === wallet.publicKey)
        if (entry) {
            //this.emit("change", { side, ...entry, prevQuantity: entry.quantity, currentQuantity: entry.quantity + quantity })
            entry.quantity += quantity
        } else {
            ob.push({ fromWallet: wallet, price, quantity });
        }

        const tolerEntries = obInverse.filter(v => v.price === price && v.fromWallet.publicKey !== wallet.publicKey)

        for (let i = 0; i < tolerEntries.length; i++) {
            let curTolerEntry = tolerEntries[i]
            if (tolerEntries[i].quantity <= quantity) {
                quantity -= curTolerEntry.quantity;
                this.emit("change", { side, ...curTolerEntry, diff: curTolerEntry.quantity })
                obInverse.splice(obInverse.indexOf(curTolerEntry), 1)
                i--;
            } else {
                const change = curTolerEntry.quantity - quantity
                this.emit("change", { side, ...curTolerEntry, diff: curTolerEntry.quantity - change })
                curTolerEntry.quantity = change
            }
        }

        if (quantity === 0) {
            this.emit("change", { side: TradeSide.Sell, fromWallet: wallet, price, diff: initalQuantity })
            ob = ob.filter(e => e.quantity > 0);
        } else {
            this.emit("change", { side: TradeSide.Sell, fromWallet: wallet, price, diff: initalQuantity - quantity })
        }
    }

    public addSell(wallet: { publicKey: string }, price: number, quantity: number) {
        this.processOrder(wallet, TradeSide.Sell, price, quantity)
    }

    public addBuy(wallet: { publicKey: string }, price: number, quantity: number) {
        this.processOrder(wallet, TradeSide.Buy, price, quantity)
    }
}
