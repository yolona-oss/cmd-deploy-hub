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

        let tolerEntries: IOrderBookEntry[] = []
        for (const te of obInverse) {
            if (te.fromWallet.publicKey === wallet.publicKey)
                continue

            if (te.price === price) {
                tolerEntries.push(te)
            }
            //if (side === TradeSide.Sell && te.price >= price) {
            //    tolerEntries.push(te)
            //} else if (te.price === price) {
            //    tolerEntries.push(te)
            //}
        }
        tolerEntries.sort((a, b) => a.price - b.price) // from low to high

        //let avgPrice = 0
        for (let i = 0; i < tolerEntries.length && quantity > 0; i++) {
            let curTolerEntry = tolerEntries[i]
            if (tolerEntries[i].quantity <= quantity) {
                quantity -= curTolerEntry.quantity;
                // close order
                this.emit("change", { side, ...curTolerEntry, diff: curTolerEntry.quantity })
                obInverse = obInverse.filter(e => e !== curTolerEntry)
                i--;
            } else {
                const change = curTolerEntry.quantity - quantity
                this.emit("change", { side, ...curTolerEntry, diff: curTolerEntry.quantity - change })
                obInverse.find(e =>
                    e.price === curTolerEntry.price &&
                        e.fromWallet.publicKey === curTolerEntry.fromWallet.publicKey &&
                        e.quantity === curTolerEntry.quantity)!.quantity = change
                quantity = 0
            }
        }

        if (quantity === 0) {
            ob = ob.filter(e => e.quantity > 0);
            this.emit("change", { side: TradeSide.Sell, fromWallet: wallet, price, diff: initalQuantity })
        } else {
            const diff = initalQuantity - quantity
            if (diff != 0) {
                this.emit("change", { side: TradeSide.Sell, fromWallet: wallet, price, diff })
            }
        }
    }

    public addSell(wallet: { publicKey: string }, price: number, quantity: number) {
        this.processOrder(wallet, TradeSide.Sell, price, quantity)
    }

    public addBuy(wallet: { publicKey: string }, price: number, quantity: number) {
        this.processOrder(wallet, TradeSide.Buy, price, quantity)
    }
}
