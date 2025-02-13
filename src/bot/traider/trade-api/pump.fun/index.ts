import { IPlatformResponce, TradeOffer, ITargetInfo, IBalanceList } from 'bot/traider/types';
import { BaseTradeApi } from '../base-trade-api';

import { TransactionMode } from './types';
import type { WalletData, WalletGeneratorConfig, TransferResult } from './gen-wallets';

// Export main functions
import { pumpFunBuy, pumpFunSell } from './swap';

// Export utility functions
import {
    withRetry,
    getKeyPairFromPrivateKey,
    getCachedBlockhash,
    createTransaction,
    sendAndConfirmTransactionWrapper,
    bufferFromUInt64
} from './utils';

// Export constants
import {
    GLOBAL,
    FEE_RECIPIENT,
    TOKEN_PROGRAM_ID,
    ASSOC_TOKEN_ACC_PROG,
    RENT,
    PUMP_FUN_PROGRAM,
    PUMP_FUN_ACCOUNT,
    SYSTEM_PROGRAM_ID
} from './constants';

// Export API functions
import { getCoinData } from './api';

// Export Wallet Generator
import { WalletGenerator } from './gen-wallets';
import { Connection, LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js';

export class PumpFunTradeApi extends BaseTradeApi<WalletData, any> {
    constructor() {
        super("pump-fun")
    }

    async assetInfo(target: string): Promise<ITargetInfo> {
        const coinData = await getCoinData(target);

        return {
            MC: 0,
            CurPrice: 0,
            Volume: 0,
            CurSupply: 0,
            Holders: 0,
            trades: async () => {
                return {
                    trades: [],
                    overallTxCount: 0,
                    offset: 0,
                    limit: 0
                }
            }
        }
    }

    async balance(traider: WalletData): Promise<IBalance> {
        const connection = new Connection(
            `https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}`,
            {
                commitment: 'confirmed',
                confirmTransactionInitialTimeout: 60000
            }
        );

        const wallet = new PublicKey(traider.publicKey)
        const balance = await connection.getBalance(wallet);

        return balance * LAMPORTS_PER_SOL
    }

    async buy(opt: TradeOffer<WalletData>): Promise<IPlatformResponce<any>> {
        let sign = ""
        try {
            sign = <string>(await pumpFunBuy(TransactionMode.Execution, opt.traider.secretKey, opt.target, opt.value.price*opt.value.quantity, opt.fee, opt.slippage))
        } catch(e) {
            console.log(e)
            return {
                signature: sign, 
                error: e,
                success: false,
            }
        }
        

        return {
            signature: sign,
            success: false,
        }
    }

    async sell(opt: TradeOffer<WalletData>): Promise<IPlatformResponce<any>> {
        let sign = ""
        try {
            sign = <string>(await pumpFunSell(TransactionMode.Execution, opt.traider.secretKey, opt.target, opt.value.price*opt.value.quantity, opt.fee, opt.slippage))
        } catch (e) {
            console.log(e)
            return {
                signature: sign, 
                error: e,
                success: false,
            }
        }
        return {
            signature: sign,
            success: false,
        }
    }

    async createTraider(wallet: WalletData): Promise<void> {
    }

    async createTarget(_: string, __: string, ___: number): Promise<void> {
        throw new Error("Not implemented")
    }

    async addBalance(src: WalletData, dst: WalletData, amount: number): Promise<void> {

    }

}
