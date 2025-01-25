export interface IConnection {
    connect(): Promise<void>
    disconnect(): Promise<void>
}
