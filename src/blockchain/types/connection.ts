import { Connection } from '@solana/web3.js';
import { Web3 as LibWeb3 } from 'web3'

export interface IBlockchainConnection<ConnType> {
    connect(): Promise<void>
    disconnect(): Promise<void>
    IsConnected(): boolean
    getConnection(): ConnType
}
