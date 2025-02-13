//import { IBuilder } from "types/builder"
//import { randomizeWithScatter } from "utils/random"
//
///***
// * Main curve generation function.
// * Be sure to implement it with proper step compliance!
// *
// * @param price current price in order
// * @param prevPrice previous price in order
// * @param curStepN current step number
// * @param overallStepN total number of steps
// */
//export type priceStepScatterFn = (price: number|bigint, prevPrice: number|bigint, curStepN: number, overallStepN: number) => number|bigint
//
//export interface BumpPumpParam {
//    curveGenerator: () => void
//    price: {
//        from: number|bigint // current price on exchange
//        to: number|bigint // target price
//    }
//    scatterPrice: (v: number|bigint, prevV: number|bigint) => number|bigint
//    scatterVolume: (v: number|bigint, prevV: number|bigint) => number|bigint
//    volume: number|bigint
//    points: number
//}
//
///***
// * Generate curve with agresive static stragery uses huge amount transactions.
// * Will be precents pretty result with huge ammount of maxBumps.
// * Used randomization with scatters to create curve.
// *
// * @param {BumpPumpParam} priceParam price and volume change parameters
// * @param {number} maxBumps number of possible transactions to create curve
// * @returns {Array<{ volume: bigint, price: bigint }>}
// *
// * Result will be array of objects with volume and price and bots must buy and sell it in order in the same time
// */
//export function BumpPump(
//    priceParam: BumpPumpParam,
//): Array<{ volume: bigint, price: bigint }>
//{
//    const maxBumps = priceParam.points
//    const res = new Array()
//
//    let prev_price = 0
//    let prev_volume = 0
//    let prev_price_step = 0
//
//    const price_map = new Array()
//
//    price_map[0] = Number(priceParam.price.from)
//    for (let i = 1; i < maxBumps; i++) {
//        price_map[i] = price_map[i - 1] + priceParam.priceStepScatter(
//            price_map[i - 1],
//            prev_price_step,
//            i,
//            maxBumps
//        )
//    }
//
//    for (let i = 0; i < maxBumps; i++) {
//        const cur_price = price_map[i];
//        const cur_scatterPrice = priceParam.scatterPrice(cur_price, prev_price);
//        const rand_price = randomizeWithScatter(BigInt(cur_price), BigInt(cur_scatterPrice))
//
//        const scatter_volume = priceParam.scatterVolume(priceParam.volume, prev_volume);
//        const cur_volume = randomizeWithScatter(
//            BigInt(priceParam.volume),
//            scatter_volume
//        )
//
//        res.push({
//            volume: cur_volume,
//            price: rand_price,
//        })
//    }
//
//    return res
//}
