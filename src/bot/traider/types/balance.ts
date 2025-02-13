export interface IBalance<T extends number|bigint = bigint> {
    currency: string,
    balance: T
}

export type IBalanceList<T extends number|bigint = number> = Array<IBalance<T>>
