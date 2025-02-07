import { DEXWallet } from './wallet'

// TODO: create interface for centralized exchanges
export interface ITraider {
    wallet: DEXWallet
}

export interface ITraderCreateDTO {
    wallet: {
        publicKey: string
    }
}
