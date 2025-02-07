import { ExTimeRange } from "./time-range";
import { LinkedList } from "utils/struct/linked-list";
import { TradeSide } from "./trade";

export interface ExCurveSimpleNode {
    open: number,
    close: number,
    high: number,
    low: number,
    timeStart: number
}

export interface ExCurveFullNode {
    trades: ExCurveTrade[],
    timeStart: number,
}

export interface ExCurveTrade {
    price: number,
    quantity: number,
    side: typeof TradeSide[keyof typeof TradeSide];
}

export type ExCurveNodeList<T extends "simple" | "full"> = LinkedList<T extends "simple" ? ExCurveSimpleNode : ExCurveFullNode>

export type isExCurveSimpleNode = (obj: any) => obj is ExCurveSimpleNode
export type isExCurveFullNode = (obj: any) => obj is ExCurveFullNode
