import { IWallet } from 'bot/traider/types/wallet'
import { ITradeErrorType, ITradeError } from './error'

export interface ITradeApi<CurrencyType extends string> {
    tradingPlatform: string

    wallet(): Promise<IWallet<CurrencyType>>

    sell(amount: number): Promise<null|ITradeError>
    buy(amount: number): Promise<null|ITradeError>
}
