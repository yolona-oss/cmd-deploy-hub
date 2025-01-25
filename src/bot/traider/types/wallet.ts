export type IWallet<T extends string> = {
    address: string
    password: string

    balance: number
    currency: T
}
