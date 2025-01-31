import {
    Connection,
    PublicKey,
    clusterApiUrl,
    LAMPORTS_PER_SOL,
    SystemProgram,
    Transaction,
    sendAndConfirmTransaction,
    Cluster,
    Keypair,
    TransactionInstruction,
    VersionedTransaction,
    TransactionMessage,
} from '@solana/web3.js';
import { IBlockchainConnection } from 'blockchain/types/connection';

export class SolanaConnection implements IBlockchainConnection<Connection> {
    private connection?: Connection;
    private isConnected: boolean = false;

    constructor(
        private cluster: Cluster = 'mainnet-beta',
        private senderPrivKey: Keypair = Keypair.generate()
    ) { }

    IsConnected(): boolean {
        return this.isConnected
    }

    async connect(): Promise<void> {
        if (this.isConnected) {
            throw new Error("BlockchainClient.connect() Already connected")
        }
        this.connection = new Connection(clusterApiUrl(this.cluster), 'confirmed');
        this.isConnected = true
    }

    async disconnect(): Promise<void> {
        if (!this.isConnected) {
            throw new Error("BlockchainClient.disconnect() Not connected")
        }
        this.isConnected = false
        this.connection = undefined
    }

    public getConnection(): Connection {
        return this.connection!
    }

    private async createVersionedTransaction(
        instructions: TransactionInstruction[],
        recentBlockhash: string | undefined = undefined
    ) {
        if (!recentBlockhash) {
            recentBlockhash = (await this.connection!.getLatestBlockhash()).blockhash;
        }

        const messageV0 = new TransactionMessage({
            payerKey: this.senderPrivKey.publicKey,
            recentBlockhash: recentBlockhash,
            instructions: instructions,
        }).compileToV0Message();

        const transaction = new VersionedTransaction(messageV0);
        return transaction;
    }

    private async sendVersionedTransaction(
        transaction: VersionedTransaction,
    ) {
        transaction.sign([this.senderPrivKey]);
        const rawTransaction = transaction.serialize();
        const signature = await this.connection!.sendRawTransaction(rawTransaction, {
            skipPreflight: true,
        });
        return signature;
    }

    private async confirmTransaction(signature: string) {
        const confirmation = await this.connection!.confirmTransaction(signature, 'confirmed');
        return confirmation;
    }

    async getGasPrice(): Promise<bigint> {
        return await this.connection!.getRecentBlockhash()
            .then(({ feeCalculator }) => BigInt(feeCalculator.lamportsPerSignature));
    }

    async getCurrentBlockOrSlot(): Promise<number> {
        return this.connection!.getSlot();
    }

    async getBalance(address: string): Promise<bigint> {
        const publicKey = new PublicKey(address);
        const balance = await this.connection!.getBalance(publicKey);
        return BigInt(balance / LAMPORTS_PER_SOL)
    }

    async sendTransaction(from: string, to: string, value: string, _: number, __?: string): Promise<string> {
        const fromPubkey = new PublicKey(from);
        const toPubkey = new PublicKey(to);
        const transaction = new Transaction().add(
            SystemProgram.transfer({
                fromPubkey,
                toPubkey,
                lamports: parseFloat(value) * LAMPORTS_PER_SOL
            })
        );
        return await sendAndConfirmTransaction(this.connection!, transaction, [this.senderPrivKey]);
    }

    async interactWithContract(
        contractAddress: string,
        abi: any,
        methodName: string,
        ...args: any[]
    ): Promise<any> {
        const instruction = new TransactionInstruction({
            keys: [
                { pubkey: new PublicKey(contractAddress), isSigner: false, isWritable: true },
                { pubkey: this.senderPrivKey.publicKey, isSigner: false, isWritable: true },
                { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
            ],
            programId: new PublicKey(contractAddress),
            data: Buffer.from(abi.interface.encodeFunctionData(methodName, args)),
        });

        const messageV0 = new TransactionMessage({
            payerKey: this.senderPrivKey.publicKey,
            recentBlockhash: (await this.connection!.getLatestBlockhash()).blockhash,
            instructions: [instruction],
        }).compileToV0Message();

        const transaction = new VersionedTransaction(messageV0);
        try {
            const rawTransaction = transaction.serialize();
            const signature = await this.connection!.sendRawTransaction(rawTransaction, {
                skipPreflight: true,
            });

            const confirmation = await this.connection!.confirmTransaction(signature, 'confirmed');
            if (confirmation.value.err) {
                throw new Error("SolanaConnection.interactWithContract() Configramtion error: " + confirmation.value.err.toString());
            }
        } catch (error) {
            throw new Error("SolanaConnection.interactWithContract() Error: " + error);
        }
    }

    async sendTransactionToContract(
        contractAddress: string,
        abi: any,
        methodName: string,
        from: string,
        ...args: any[]
    ): Promise<void> {
        const instruction = new TransactionInstruction({
            keys: [
                { pubkey: new PublicKey(contractAddress), isSigner: false, isWritable: true },
                { pubkey: new PublicKey(from), isSigner: true, isWritable: true },
                { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
            ],
            programId: new PublicKey(contractAddress),
            data: Buffer.from(abi.interface.encodeFunctionData(methodName, args)),
        });

        const transaction = await this.createVersionedTransaction([instruction]);
        const signature = await this.sendVersionedTransaction(transaction);

        const confirmation = await this.confirmTransaction(signature);
        if (confirmation.value.err) {
            throw new Error("SolanaConnection.sendTransactionToContract() Error: " + confirmation.value.err.toString());
        }
    }

    async getBlockNumber(): Promise<bigint> {
        return BigInt(await this.connection!.getBlockHeight())
    }

}
