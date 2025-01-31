import { ITradeTxResult, TradeOffer, ITargetInfo, IBalance } from 'bot/traider/types';
import { BaseTradeApi } from '../base-trade-api';

// Export types
export { TransactionMode } from './types';
export type { WalletData, WalletGeneratorConfig, TransferResult } from './gen-wallets';

// Export main functions
export { pumpFunBuy, pumpFunSell } from './swap';

// Export utility functions
export {
    withRetry,
    getKeyPairFromPrivateKey,
    getCachedBlockhash,
    createTransaction,
    sendAndConfirmTransactionWrapper,
    bufferFromUInt64
} from './utils';

// Export constants
export {
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
export { getCoinData } from './api';

// Export Wallet Generator
export { WalletGenerator } from './gen-wallets';

import { WalletData } from './gen-wallets';
import { getCoinData } from './api';

export class PumpFunTradeApi extends BaseTradeApi<WalletData, any> {
    constructor() {
        super("pump-fun")
    }

    async TargetInfo(target: string): Promise<ITargetInfo> {
        const coinData = await getCoinData(target);

        return {
            MC: 0n,
            CurPrice: 0n,
            Volume: 0n,
            CurSupply: 0n,
            Holders: 0n,
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

    async Balance(traider: WalletData): Promise<IBalance> {
        traider
        return {
            currency: "SOL",
            balance: 0n
        }
    }

    async buy(opt: TradeOffer<WalletData>): Promise<ITradeTxResult<any>> {
        opt
        return {
            signature: "",
            error: undefined,
            results: undefined,
            success: false,
        }
    }

    async sell(opt: TradeOffer<WalletData>): Promise<ITradeTxResult<any>> {
        opt
        return {
            signature: "",
            error: undefined,
            results: undefined,
            success: false,
        }
    }
}
