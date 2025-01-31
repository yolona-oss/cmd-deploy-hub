import { IRunnable } from "types/runnable";
import { EventEmitter, EventMap } from "utils/EventEmitter";
import { ThreadPool } from "utils/thread-pool";

export interface ICommandService extends IRunnable {
}

interface bcs_em<T> extends EventMap {
    message: T,
    error: string,
    done: void
}

export abstract class BaseCommandService<MsgType = string> extends EventEmitter<bcs_em<MsgType>> implements ICommandService {
    private isActive: boolean = false

    constructor(
        public readonly name: string,
    ) {
        super()
    }

    isRunning(): boolean {
        return this.isActive
    }

    async run(): Promise<void> {
        this.isActive = true
    }

    async terminate(): Promise<void> {
        this.isActive = false
        this.emit("done")
    }
}
