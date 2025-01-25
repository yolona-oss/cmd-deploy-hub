import { Network } from 'blockchain/types'

export type AvalibleChains = 'bsc' | 'eth' | 'matic' | 'arbitrum' | 'optimism' | 'gnosis' | 'klaytn' | 'solana' | 'dummy'

const web3_networks: Record<AvalibleChains, Network> = {
    "bsc": {
        rpc: new URL("https://bsc-dataseed1.binance.org/"),
        chainId: 56
    },
    "eth": {
        rpc: new URL("https://www.ethercluster.com/etc"),
        chainId: 1
    },
    "matic": {
        rpc: new URL("https://rpc-mainnet.maticvigil.com/"),
        chainId: 137
    },
    "arbitrum": {
        rpc: new URL("https://arb1.arbitrum.io/rpc"),
        chainId: 42161
    },
    "optimism": {
        rpc: new URL("https://mainnet.optimism.io/"),
        chainId: 10
    },
    "gnosis": {
        rpc: new URL("https://rpc.gnosischain.com/"),
        chainId: 100
    },
    "klaytn": {
        rpc: new URL("https://klaytn-mainnet.infura.io/v3/"),
        chainId: 81
    },
    "solana": {
        rpc: new URL("https://api.mainnet-beta.solana.com/"),
        chainId: 101
    },
    "dummy": {
        rpc: new URL("http://expample.com"),
        chainId: -1
    }
}

export const web3_dummy_network = web3_networks["dummy"]

export default web3_networks
