import { ITradeTargetValue } from "bot/traider/types/trade"
import { Point2D } from "utils/math/point"
import { randomizeWithPercentScatter } from "utils/random"

export function curveToTxList(
    priceCurve: Point2D[],
    volumeCurve: Point2D[],
    scatterPricePerc: number = 0,
    scatterVolumePerc: number = 0): Array<ITradeTargetValue> {
    const res = []

    for (let i = 0; i < priceCurve.length; i++) {
        res.push({
            price: randomizeWithPercentScatter(priceCurve[i].y, scatterPricePerc),
            volume: randomizeWithPercentScatter(volumeCurve[i].y, scatterVolumePerc)
        })
    }

    return res as any
}
