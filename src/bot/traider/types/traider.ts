import { IDEXWallet } from './wallet'

// TODO: create interface for centralized exchanges
export interface ITraider {
    wallet: IDEXWallet
}

export interface ITraderCreateDTO {
    wallet: {
        publicKey: string
    }
}
