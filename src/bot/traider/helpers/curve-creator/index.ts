import { ITradeSupply } from "bot/traider/types/trade"
import { Point2D } from "utils/math/point"
import { randomizeWithPercentScatter } from "utils/random"

const FIXED_PRECISION = 2

export function curveToTxList<T extends number | bigint = number>(
    priceCurve: Point2D<T>[],
    quantityCurve: Point2D<T>[],
    scatters: {
        pricePerc?: number,
        volumePerc?: number
    } = {}): Array<ITradeSupply<T>> {

    const res: Array<ITradeSupply<T>> = []

    for (let i = 0; i < priceCurve.length; i++) {
        const price = randomizeWithPercentScatter<T>(priceCurve[i].y, scatters.pricePerc ?? 0, FIXED_PRECISION)
        const quantity = randomizeWithPercentScatter<T>(quantityCurve[i].y, scatters.volumePerc ?? 0, 0)
        res.push({
            price,
            quantity
        })
    }

    return res
}
