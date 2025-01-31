import { IRunnable } from "types/runnable";
import log from "utils/logger"
import { HMSTime, sleep } from 'utils/time'

import { ICommand } from 'types/command'
import { AbstractState } from "types/state";
import { Identificable } from "types/identificable";

type ITask<T = void> = {
    command: ICommand<T>
    delay?: HMSTime;
} & Identificable;

interface ThreadPoolMetrics {
    activeTasks: number
    totalTasks: number
    processedTasks: number
    errors: number
    avgExecTime: number
    minExecTime: number
    maxExecTime: number
}

class TPCtx {
    private state: TPState
    private _metrics: ThreadPoolMetrics

    constructor(state: TPState) {
        this.state = state
        this._metrics = {
            activeTasks: 0,
            totalTasks: 0,
            processedTasks: 0,
            errors: 0,
            avgExecTime: 0,
            minExecTime: 0,
            maxExecTime: 0
        }
    }

    public transitionTo(state: TPState) {
        this.state = state
        this.state.setContext(this)
    }

    public getConcurrency() {
        return this.state.getConcurrency()
    }

    public setConcurrency(concurrency: number) {
        this.state.setConcurrency(concurrency)
    }

    public metrics(): ThreadPoolMetrics {
        return this._metrics
    }

    public upateExeTime(execTime: number) {
        this._metrics.avgExecTime = (this._metrics.avgExecTime * this._metrics.processedTasks + execTime) / (this._metrics.processedTasks + 1)
        this._metrics.minExecTime = Math.min(this._metrics.minExecTime, execTime)
        this._metrics.maxExecTime = Math.max(this._metrics.maxExecTime, execTime)
    }

    public updateTaskDone() {
        this._metrics.activeTasks--
        this._metrics.totalTasks--
        this._metrics.processedTasks++
    }

    public updateError(e: any) {
        e
        this._metrics.errors++
    }
}

interface ITPState {
    getConcurrency(): number
    getLatency(): HMSTime
}

class TPState extends AbstractState<TPCtx> implements ITPState {
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

    public setConcurrency(concurrency: number) {
        this.concurrency = concurrency
    }

    public getLatency(): HMSTime {
        return this.latency
    }

    public setLatency(latency: HMSTime) {
        this.latency = latency
    }
}

export class ThreadPool implements IRunnable {
    private active: boolean = false
    private taskQueue: ITask[] = []

    private ctx: TPCtx

    constructor(concurrency?: number) {
        this.ctx = new TPCtx(new TPState())
        this.ctx.setConcurrency(concurrency || 10)
    }

    public isRunning(): boolean {
        return this.active
    }

    /***
    * @description Wait for all tasks to finish
    */
    public async waitTasks(): Promise<void> {
        while (this.ctx.metrics().activeTasks > 0) {
            await sleep(100)
        }
    }

    public getMetrics(): ThreadPoolMetrics {
        return Object.assign({}, this.ctx.metrics())
    }

    public getConcurrency(): number {
        return this.ctx.getConcurrency()
    }

    enqueue<T>(task: ITask<T>): Promise<T> {
        if (!this.active) {
            throw new Error("ThreadPool::enqueue() ThreadPool is not running")
        }

        this.ctx.metrics().totalTasks++
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

    public unenqueue(id: string) {
        this.taskQueue = this.taskQueue.filter((task) => task.id !== id)
        this.ctx.metrics().totalTasks = this.taskQueue.length
    }

    private async processQueue() {
        if (this.ctx.metrics().activeTasks >= this.ctx.getConcurrency()
            ||
            this.taskQueue.length === 0
        ) {
            return;
        }

        // NOTE: ?? may crush ?? fucking emacsript asynchronous designe
        const task = this.taskQueue.shift()!
        this.ctx.metrics().activeTasks++

        try {
            if (task.delay) {
                HMSTime.sleep(task.delay.toJSON())
            }
            const start = Date.now()
            await task.command.execute()
            this.ctx.upateExeTime(Date.now() - start)
        } catch(e: any) {
            this.ctx.updateError(e)
            log.error(`ThreadPool::processQueue() error: ${e}`)
        } finally {
            this.ctx.updateTaskDone()
            this.processQueue()
        }
    }

    public async run() {
        if (this.active) {
            log.warn("ThreadPool::run() called when already active")
            return
        }

        this.active = true
        return this.processQueue()
    }

    public async terminate() {
        if (this.active == false) {
            log.warn("ThreadPool::terminate() called when not active")
            return
        }
        this.active = false
    }
}
