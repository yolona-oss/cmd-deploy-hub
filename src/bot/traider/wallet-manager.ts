import { IBalance } from './types';
import { IDEXWallet } from './types/wallet';
import { getInitialConfig } from 'config';

import log from 'utils/logger'
import * as fs from 'fs'
import path from 'path'

export abstract class BaseWalletManager {
    abstract createWallet(): Promise<IDEXWallet>;
    abstract collect(src: IDEXWallet[], dst: Omit<IDEXWallet, "secretKey">): Promise<(IBalance<bigint>&Omit<IDEXWallet, "secretKey">)[]>
    abstract distribute(src: Omit<IDEXWallet, "publicKey">, dst: { wallet: Omit<IDEXWallet, "secretKey">, amount: bigint }[]): Promise<(IBalance<bigint>&Omit<IDEXWallet, "secretKey">)[]>
    abstract balance(wallet: Omit<IDEXWallet, "secretKey">): Promise<number>

    protected saveUsedWallet(wallet: IDEXWallet) {
        const cfg = getInitialConfig()
        const pathToSaveFile = path.join(
            cfg.server.fileStorage.path,
            "used-wallets.json"
        )
        const data = fs.readFileSync(pathToSaveFile, 'utf8')
        try {
            const obj: any = JSON.parse(data)
            if (!obj?.wallets) {
                obj.wallets = []
            }
            obj.wallets.push(wallet)
            fs.writeFileSync(pathToSaveFile, JSON.stringify(obj, null, 4))
        } catch (e) {
            log.error(`Error saving used wallets: ${e}`)
        }
    }
}

import { Connection, Keypair, SystemProgram, Transaction, PublicKey } from '@solana/web3.js';
import bs58 from 'bs58';
import { sleep } from 'utils/time';

export class SolanaWalletManager extends BaseWalletManager {
    private connection: Connection;

    constructor(rpc: string) {
        super()
        this.connection = new Connection(rpc, 'confirmed');
    }

    public decodeWallet(base64SecretKey: string): Keypair {
        return Keypair.fromSecretKey(
            Uint8Array.from(Buffer.from(base64SecretKey, 'base64'))
        );
    }

    public createWalletFromPrivateKey(privateKeyBase58: string): Keypair {
        const privateKeyBytes = Uint8Array.from(bs58.decode(privateKeyBase58));
        return Keypair.fromSecretKey(privateKeyBytes);
    }

    async balance(wallet: Omit<IDEXWallet, "secretKey">) {
        const conn = new Connection("api.mainnet-beta.solana.com")
        return await conn.getBalance(new PublicKey(wallet.publicKey))
    }

    async createWallet(): Promise<IDEXWallet> {
        const w = Keypair.generate()
        return {
            publicKey: w.publicKey.toString(),
            secretKey: Buffer.from(w.secretKey).toString('base64')
        }
    }

    private async collectFromOne(src: Omit<IDEXWallet, "publicKey">, dst: Omit<IDEXWallet, "secretKey">, rest?: bigint): Promise<{ success: boolean, transferAmount?: bigint, message?: string }> {
        try {
            const wallet = this.decodeWallet(src.secretKey);
            const balance = BigInt(await this.connection.getBalance(wallet.publicKey));
            const transferAmount = balance - (rest ?? 0n);

            if (transferAmount <= 0) {
                return {
                    success: false,
                    message: 'Insufficient balance for transfer'
                }
            }

            const transaction = new Transaction().add(
                SystemProgram.transfer({
                    fromPubkey: wallet.publicKey,
                    toPubkey: new PublicKey(dst.publicKey),
                    lamports: transferAmount,
                })
            );

            const signature = await this.connection.sendTransaction(transaction, [wallet]);
            await this.connection.confirmTransaction(signature);
            return {
                success: true,
                transferAmount
            }
        } catch (e: any) {
            return {
                success: false,
                message: e?.message
            }
        }
    }

    async collect(src: IDEXWallet[], dst: Omit<IDEXWallet, "secretKey">): Promise<(IBalance&Omit<IDEXWallet, "secretKey">)[]> {
        const ret = []
        for (const wallet of src) {
            const { success, transferAmount, message } = await this.collectFromOne(wallet, dst)
            if (success) {
                ret.push({
                    publicKey: wallet.publicKey,
                    currency: "LAMPORTS",
                    balance: transferAmount!
                })
            } else if (message) {
                log.error(`Error collecting from ${wallet.publicKey}: ${message}`)
            }
        }
        return ret
    }

    async distribute(src: Omit<IDEXWallet, "publicKey">, dst: { wallet: Omit<IDEXWallet, "secretKey">, amount: bigint }[]): Promise<(IBalance<bigint>&Omit<IDEXWallet, "secretKey">)[]> {
        const retries = 3
        const srcWallet = this.decodeWallet(src.secretKey)
        const distributeSingle = async (destination: { wallet: Omit<IDEXWallet, "secretKey">, amount: bigint }) => {
            for (let attempt = 0; attempt < retries; attempt++) {
                try {
                    const transaction = new Transaction().add(
                        SystemProgram.transfer({
                            fromPubkey: new PublicKey(srcWallet.publicKey),
                            toPubkey: new PublicKey(destination.wallet.publicKey),
                            lamports: destination.amount,
                        })
                    );

                    const signature = await this.connection.sendTransaction(
                        transaction, 
                        [srcWallet]
                    );
                    await this.connection.confirmTransaction(signature);
                    log.echo(`sign: ${signature} <|> Distributed ${destination.amount} lamports to ${destination.wallet.publicKey}`)
                    return
                } catch (err: any) {
                    if (attempt === retries - 1) throw err;
                    if (err.message.includes('429')) {
                        await sleep(1000 * (attempt + 1));
                        continue;
                    }
                    throw err;
                }
            }
            throw new Error('Max retries reached');
        }

        let ret = []
        for (const destination of dst) {
            try {
                await distributeSingle(destination)
                ret.push({
                    publicKey: destination.wallet.publicKey,
                    currency: "LAMPORTS",
                    balance: destination.amount
                })
            } catch (e) {
            }
        }
        return ret
    }
}
