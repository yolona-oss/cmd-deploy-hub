import { IRunnable } from "types/runnable";
import log from "utils/logger"
import { HMSTime } from 'utils/time'

import { ICommand } from 'types/command'
import { AbstractState } from "types/state";

type ITask<T = void> = {
    command: ICommand<T>
    delay?: HMSTime;
};

interface SchedulerMetrics {
    activeTasks: number
    totalTasks: number
    processedTasks: number
    errors: number
    avgLatency: number
    maxLatency: number
    minLatency: number

    prevTaskExecutionTime: number
    prevTaskLatency: number
}

class SchedulerLatencyCtx {
    private state: SchedulerState
    private metrics: SchedulerMetrics

    constructor(state: SchedulerState) {
        this.state = state
        this.metrics = {
            activeTasks: 0,
            totalTasks: 0,
            processedTasks: 0,
            errors: 0,
            avgLatency: 0,
            maxLatency: 0,
            minLatency: 0,
            prevTaskExecutionTime: 0,
            prevTaskLatency: 0
        }
    }

    public transitionTo(state: SchedulerState) {
        this.state = state
        this.state.setContext(this)
    }

    public async sleep() {
        if (this.state.getLatency().toMilliseconds() > 0) {
            return await HMSTime.sleep(this.state.getLatency().toJSON())
        }
        return
    }

    public getConcurrency() {
        return this.state.getConcurrency()
    }
}

interface ISchedulerState {
    getConcurrency(): number
    getLatency(): HMSTime
}

class SchedulerState extends AbstractState<SchedulerLatencyCtx> implements ISchedulerState {
    private latency: HMSTime
    private concurrency: number

    constructor() {
        super()
        this.latency = new HMSTime()
        this.concurrency = 1
    }

    public getConcurrency() {
        return this.concurrency
    }

    public getLatency(): HMSTime {
        return this.latency
    }

    public setLatency(latency: HMSTime) {
        this.latency = latency
    }
}

export class Scheduler implements IRunnable {
    private active: boolean = false
    private taskQueue: ITask[] = []
    private activeTasks: number = 0

    private ctx: SchedulerLatencyCtx

    constructor() {
        this.ctx = new SchedulerLatencyCtx(new SchedulerState())
    }

    public isRunning(): boolean {
        return this.active
    }

    enqueue<T>(task: ITask<T>): Promise<T> {
        if (!this.active) {
            throw new Error("Scheduler::enqueue() Scheduler is not running")
        }

        return new Promise((resolve, reject) => {
            this.taskQueue.push({
                ...task,
                command: {
                    execute: async () => {
                        try {
                            const result = await task.command.execute();
                            resolve(result);
                        } catch (error) {
                            reject(error);
                        }
                    }
                }
            })
            this.processQueue();
        })
    }

    private async processQueue() {
        if (this.activeTasks >= this.ctx.getConcurrency() || this.taskQueue.length === 0) {
            return;
        }

        const task = this.taskQueue.shift()!
        this.activeTasks++

        try {
            await task.command.execute()
        } catch(e) {
        } finally {
            this.activeTasks--
            await this.ctx.sleep()
            this.processQueue()
        }
    }

    public async run() {
        if (this.active) {
            log.warn("Scheduler::run() called when already active")
            return
        }

        this.active = true
        return this.processQueue()
    }

    public async terminate() {
        if (this.active == false) {
            log.warn("Scheduler::terminateProcessing() called when not active")
            return
        }
        this.active = false
    }
}
