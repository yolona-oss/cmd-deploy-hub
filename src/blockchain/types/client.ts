import { TransactionReceipt } from 'web3'

export interface IBlockchainClient {
    getBlockNumber(): Promise<bigint>
    getBalance(address: string): Promise<bigint>
    sendTransaction(from: string, to: string, value: string, gas: number, data?: string): Promise<TransactionReceipt>
    interactWithContract(contractAddress: string, abi: any, methodName: string, ...args: any[]): Promise<any>
    sendTransactionToContract(contractAddress: string, abi: any, methodName: string, from: string, gas: number, ...args: any[]): Promise<TransactionReceipt>
}
