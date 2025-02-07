export interface IBaseTradeTarget {
    market_id: string
    symbol: string
}

export interface IBaseDEXTradeTarget extends IBaseTradeTarget {
    mint: string
}
