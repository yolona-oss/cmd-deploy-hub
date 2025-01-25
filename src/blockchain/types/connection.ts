export interface IBlockchainConnection {
    connect(): void
    disconnect(): void 
    IsConnected(): boolean

    sendTransaction(from: string, to: string, value: string, gas: number, data?: string): Promise<any>
    sendTransactionToContract(contractAddress: string, abi: any, methodName: string, from: string, gas: number, ...args: any[]): Promise<any>
    interactWithContract(contractAddress: string, abi: any, methodName: string, ...args: any[]): Promise<any>
    getBlockNumber(): Promise<bigint>
    getBalance(address: string): Promise<bigint>
    getGasPrice(): Promise<bigint>
}
