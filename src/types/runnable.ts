export interface IRunnable {
    isRunning(): boolean

    run(): Promise<void>
    terminate(): Promise<void>
}
