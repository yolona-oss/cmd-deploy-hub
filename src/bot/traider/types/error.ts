export const ITradeErrorType = {
    NOT_ENOUGH_BALANCE: 'NOT_ENOUGH_BALANCE',

    UNKNOWN: 'UNKNOWN',
}
export interface ITradeError {
    error: string
    type: typeof ITradeErrorType
}

