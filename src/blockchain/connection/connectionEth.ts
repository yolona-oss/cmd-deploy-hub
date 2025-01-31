import { Web3 as LibWeb3, TransactionReceipt } from 'web3'
import { Network } from 'blockchain/types';
import supportedNetworks, { web3_dummy_network } from 'blockchain/internal/networks';
import { IBlockchainConnection } from 'blockchain/types/connection';
import { RegisteredSubscription } from 'web3/lib/commonjs/eth.exports';

export class EthBlockchainConnection implements IBlockchainConnection<LibWeb3<RegisteredSubscription>> {
    private isConnected: boolean = false
    private web3: LibWeb3 = new LibWeb3(new LibWeb3.providers.HttpProvider(web3_dummy_network.rpc.toString()));

    constructor(
        private connNetwork: Network
    ) { }

    async connect(): Promise<void> {
        if (this.isConnected) {
            throw new Error("BlockchainClient.connect() Already connected")
        }

        this.web3 = new LibWeb3(new LibWeb3.providers.HttpProvider(supportedNetworks["eth"].rpc.toString()));

        this.connNetwork = supportedNetworks["eth"]
        this.isConnected = true
    }

    async disconnect() {
        if (!this.isConnected) {
            throw new Error("BlockchainClient.disconnect() Not connected")
        }
        this.isConnected = false
        this.connNetwork = web3_dummy_network
        return this.web3.provider?.disconnect()
    }

    IsConnected() {
        return this.isConnected
    }

    getConnection(): LibWeb3<RegisteredSubscription> {
        return this.web3
    }

    CurrentNetwork(): Network {
        return this.connNetwork
    }

    async sendTransaction(from: string, to: string, value: string, gas: number, data?: string): Promise<TransactionReceipt> {
        const tx = {
            from,
            to,
            value: this.web3.utils.toWei(value, 'ether'),
            gas,
            data
        };
        return await this.web3.eth.sendTransaction(tx);
    }

    async interactWithContract(contractAddress: string, abi: any, methodName: string, ...args: any[]): Promise<any> {
        const contract = new this.web3.eth.Contract(abi, contractAddress);
        const method = contract.methods[methodName](...args);
        return await method.call();
    }

    async sendTransactionToContract(
        contractAddress: string,
        abi: any,
        methodName: string,
        from: string,
        gas: number,
        ...args: any[]
    ): Promise<TransactionReceipt> {
        const contract = new this.web3.eth.Contract(abi, contractAddress);
        const method = contract.methods[methodName](...args);
        const encodedABI = method.encodeABI();
        const tx = {
            from,
            to: contractAddress,
            gas,
            data: encodedABI
        };
        return await this.web3.eth.sendTransaction(tx);
    }

    async getBlockNumber(): Promise<bigint> {
        return await this.web3.eth.getBlockNumber();
    }

    async getBalance(address: string): Promise<bigint> {
        return await this.web3.eth.getBalance(address);
    }

    async getGasPrice(): Promise<bigint> {
        return await this.web3.eth.getGasPrice();
    }
}
