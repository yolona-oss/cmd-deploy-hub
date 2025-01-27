import { IRunnable } from "types/runnable";
import { BaseUIContext, IUI } from "ui";

import log from 'utils/logger'
import { Identificable } from "types/identificable";
import find from "find-process";

import { LockManager } from "utils/lock-manager";

import { MongoConnect } from "db";
import { getConfig } from "config";
import mongoose from "mongoose";

export class Application<CtxType extends BaseUIContext> implements IRunnable, Identificable {
    public readonly id: string

    private active: boolean = false

    private ui: IUI<CtxType>

    public readonly lockManager: LockManager

    constructor(
        name: string,
        ui: IUI<CtxType>
    ) {
        this.ui = ui
        this.id = name
        this.lockManager = new LockManager(`./.lock`)
        process.once("beforeExit", async () => await this.terminate());
        process.on("SIGINT", () => this.terminate());
        process.on("SIGTERM", () => this.terminate());
    }

    isRunning(): boolean {
        return this.active
    }

    public removeLock(hash: string) {
        this.lockManager.deleteLockFile(LockManager.createLockFileName(hash))
    }

    private async setup() {
        try {
            log.echo("Application::setup() checking lock...")
            let lock = this.lockManager.createLockFile(this.id, process.pid.toString())
            if (!lock) { // if lock already exists
                log.echo("Application::setup() lock exists, checking if process is alive...")
                const pid = this.lockManager.getLockFileData(this.id)
                if (pid) {
                    const isAlive = (await find("pid", pid)).length > 0
                    if (!isAlive) { // if process is dead
                        log.echo("Application::setup() process is dead, creating new lock...")
                        this.lockManager.deleteLockFile(LockManager.createLockFileName(this.id))
                        lock = this.lockManager.createLockFile(this.id, process.pid.toString())
                    }
                }
            }
            if (!lock) { // if lock exists and process is alive
                throw new Error("Application.setup() application with spame id already running")
            }

            const cfg = await getConfig()
            await MongoConnect(cfg.server.database.mongoose.connectionUri)
        } catch (e: any) {
            log.error("App preinitialization failed:", e);
            process.exit(-1)
        }
    }

    async run() {
        await this.setup()

        if (this.active) {
            throw new Error("Application::run() called when already active")
        }
        this.active = true

        //if (!this.ui.isInitialized()) {
        //    throw new Error("Application::run() UI not inited")
        //}

        try {
            log.echo("Application::run() ui running...")
            await this.ui.run()

            log.echo("Application::run() processing...")
        } catch (e: any) {
            log.error("Application critical error. Terminating:", e);
            //process.exit(-1);
        }
    }

    async terminate() {
        if (this.ui.isRunning()) {
            await this.ui.terminate()
        } else {
            log.echo("Application::terminate() UI not running")
        }
        log.echo("Application::terminate() cleanup lock files...")
        this.lockManager.cleanupAll()
        await mongoose.disconnect()
        this.active = false
    }
}
