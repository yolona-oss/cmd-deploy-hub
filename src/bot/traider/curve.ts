import { LinkedList } from "utils/struct/linked-list";
import { ExCurveNodeList, ExCurveTrade } from "./types/ex-curve";
import { ExTimeRange, isExDateInRange } from "./types/time-range";
import { TimeRange } from "utils/time";

export type ExCurveTradePoint = ExCurveTrade&{time:number}
export type ExCurveTradePoints = ExCurveTradePoint[]

export class ExCurve {
    protected trades: ExCurveTradePoints

    static tradesInCut(trades: ExCurveTradePoints, start: number, range: ExTimeRange) {
        return trades.filter(v => isExDateInRange(start, v.time, range))
    }

    static sortTrades(trades: ExCurveTradePoints) {
        return trades.sort((a, b) => a.time - b.time)
    }

    static tradesInTimeCut(trades: ExCurveTradePoints, start: number, end: number) {
        return trades.filter(v => v.time >= start && v.time <= end)
    }

    constructor(initial?: ExCurveTradePoints) {
        this.trades = initial ? ExCurve.sortTrades(initial) : []
    }

    public addTrade(trade: ExCurveTradePoint) {
        this.trades.push(trade)
    }

    /***
    * @description returns copy of trades store
    */
    public getTrades() {
        return Object.assign({}, this.trades)
    }

    public mapToSimpleCurve(range: ExTimeRange, cut?: TimeRange): ExCurveNodeList<"simple"> {
        this.trades = ExCurve.sortTrades(this.trades)
        const list: ExCurveNodeList<"simple"> = new LinkedList()
        const trades = cut ?
            ExCurve.tradesInTimeCut(this.trades, cut.offset, cut.limit)
            :
            this.trades

        const trades_chunks = []

        for (let i = 0; i < trades.length;) {
            const chunk = ExCurve.tradesInCut(trades, trades[i].time, range)
            trades_chunks.push(chunk)
            i += chunk.length
        }

        for (const chunk of trades_chunks) {
            list.insertAtEnd({
                open: chunk[0].price,
                close: chunk[chunk.length - 1].price,
                high: Math.max(...chunk.map(v => v.price)),
                low: Math.min(...chunk.map(v => v.price)),
                timeStart: chunk[0].time,
            })
        }

        return list
    }

    public mapToFullCurve(range: ExTimeRange, cut?: TimeRange): ExCurveNodeList<"full"> {
        this.trades = ExCurve.sortTrades(this.trades)
        const list: ExCurveNodeList<"full"> = new LinkedList()
        const trades = cut ?
            ExCurve.tradesInTimeCut(this.trades, cut.offset, cut.limit)
            :
            this.trades

        const trades_chunks = []

        for (let i = 0; i < trades.length;) {
            const chunk = ExCurve.tradesInCut(trades, trades[i].time, range)
            trades_chunks.push(chunk)
            i += chunk.length
        }

        for (const trade of trades) {
            list.insertAtEnd({
                trades: [trade],
                timeStart: trade.time,
            })
        }
        return list
    }
}
