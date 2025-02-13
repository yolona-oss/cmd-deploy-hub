import { LAMPORTS_PER_SOL } from "@solana/web3.js"
import { IBaseDEXTradeAsset } from "bot/traider"

export type OnStopAction = "sell-all" | "sell-traiders" | "idle"
export type OnPriceSupportFailAction = "sell-all" | "idle"

// check for initialize2 to radium migration
// https://solscan.io/account/39azUYFWPz3VHgKCf3VChUwbpURdCHRxjWVowf5jUJjg
export interface IBCPS_Config {
    targetAsset: IBaseDEXTradeAsset&{boundCurvMint: string}

    // wallet to distribute to other
    motherShip: {
        secretKey: string,
        publicKey: string,
        minBalanceSol: number // iron-rations
    }

    fee: {
        priority: {
            feeSol: number,
            riseOnMEV: boolean
            riseOnMEVPercent: number
        }
    },

    initialBuy: {
        solAmount: number // amount of SOL to buy for traiders an holders
    }

    traiders: {
        count: number // traiders count without volatile bots
        // bots that will be created and trades as normal then send all assets to holders then burns
        volatile: {
            count: number
            lifeTimeSeconds: number // burn wallet after this time
            rechargeTimeSeconds: number // recreate bots after this time
        }
        intensity: {
            priceDeltaPercent: number,
            volumeDeltaPercent: number
        }
    }

    holders: {
        count: number
        hold: {
            percentFromInfusion: number, // percent of initialBuy.solAmount balance to buy for holders
        }
    }

    // try to buy on price fall for stabilize price
    // before maxLamportsToSupport not spent
    // then calls onFail action
    priceSupport: {
        fallPercent: number,
        // TODO
        buyBefore: {
            prevMaxPrice: boolean // price reached previous max price

            // check for price goes flat (before sets to => avg price*volume on period TODO!!!)
            flat: {
                periodSeconds: number // zero for period from fallPercent reached
                changePercent: number // max price change percent for flat
            }
        }
        maxLamportsToSupport: number,
        onFailDoAction: OnPriceSupportFailAction
    }

    // trigers to terminate
    terminate: {
        // on price fall do not overrides priceSupport
        stopLoss: {
            fromInitialPercent: number // price fall from initial price in moment of buying by a holder
            fromCurrentPercent: number // price fall from price in previus block or 1m|3m|5m TODO!!!!!!

            otherBotNetSellForSol: number // if others bot net or real users sell more than this amount of SOL in one minute or in current block
        },

        boundCurvProgress: number, // v
        tokenVolumeUSD: number,    // on asset reached some global target
        marketCapUSD: number,      // ^

        doAction: OnStopAction // perform some operation on robot going to stop
    },
}

export const defaultCfg: IBCPS_Config = {
    targetAsset: {
        boundCurvMint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwy6H5v2",
        symbol: "USDC",
        market_id: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwy6H5v2",
        mint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwy6H5v2",
    },

    motherShip: {
        secretKey: "0x0000000000000000",
        publicKey: "0xffffffffffffffff",
        minBalanceSol: 1
    },

    fee: {
        priority: {
            feeSol: 0.005,
            riseOnMEV: false,
            riseOnMEVPercent: 0,
        }
    },

    traiders: {
        count: 1,
        volatile: {
            count: 0,
            lifeTimeSeconds: 0
        },
        intensity: {
            priceDeltaPercent: 0,
            volumeDeltaPercent: 0
        }
    },

    holders: {
        count: 0,
        hold: {
            percentFromInfusion: 0,
        }
    },

    priceSupport: {
        fallPercent: 0,
        buyBefore: {
            prevMaxPrice: false,
            flat: {
                periodSeconds: 0,
                changePercent: 0
            }
        },
        maxLamportsToSupport: 0,
        onFailDoAction: "sell-all"
    },

    terminate: {
        stopLoss: {
            fromInitialPercent: 0,
            fromCurrentPercent: 0
        },
        boundCurvProgress: 0,
        tokenVolumeUSD: 0,
        marketCapUSD: 0,
        doAction: "sell-all"
    }
}
