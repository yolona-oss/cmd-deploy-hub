import { IRunnable } from "types/runnable";
import { BaseUIContext, IUI } from "ui";

import log from 'utils/logger'
import { Identificable } from "types/identificable";
import find from "find-process";

import { LockManager } from "utils/lock-manager";

import { MongoConnect } from "db";
import { getConfig } from "config";
import mongoose from "mongoose";
import { WithInit } from "types/with-init";

export abstract class Application<CtxType extends BaseUIContext> extends WithInit implements IRunnable, Identificable {
    public readonly id: string

    private active: boolean = false

    protected ui: IUI<CtxType>

    protected readonly lockManager: LockManager = new LockManager(`./.lock`)

    constructor(
        name: string,
        ui: IUI<CtxType>
    ) {
        super()
        this.ui = ui
        this.id = name
        process.on("SIGINT", async () => {
            await this.terminate()
        });
        process.on("SIGTERM", async () => {
            await this.terminate()
        });
    }

    isRunning(): boolean {
        return this.active
    }

    async Initialize(): Promise<void> {
        try {
            log.echo("Application::setup() checking lock...")
            await this.lockApp()

            const plzkillme = await getConfig()
            await MongoConnect(plzkillme.server.database.mongoose.connectionUri, plzkillme.server.database.options)
        } catch (e: any) {
            log.error("App preinitialization failed:", e);
            process.exit(-1)
        }
    }

    private _prevErrorHandler?: (error: Error) => void

    public setErrorInterceptor(handler: (error: Error) => void) {
        if (this._prevErrorHandler) {
            process.removeListener("uncaughtException", this._prevErrorHandler)
            process.removeListener("rejectionHandled", this._prevErrorHandler)
        }

        this._prevErrorHandler = handler
        process.on("uncaughtException", handler)
        process.on("rejectionHandled", handler)
    }

    public removeLock(hash: string) {
        this.lockManager.deleteLockFile(LockManager.createLockFileName(hash))
    }

    async run() {
        if (!this.isInitialized()) {
            log.error("Application. Incoreect implementations of Initialize(). Not setInitialized() called.")
            process.exit(-1)
        }

        if (this.active) {
            throw new Error("Application::run() called when already active")
        }

        try {
            log.echo("Application::run() ui running...")
            await this.ui.run()

            log.echo("Application::run() processing...")
        } catch (e: any) {
            log.error("Application critical error. Terminating:", e);
            //process.exit(-1);
        }
        this.active = true
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

    private async isPreviousRunning() {
        const pid = this.lockManager.getLockFileData(this.id)
        if (typeof pid !== "string") {
            return false
        }
        return (await find("pid", pid)).length > 0
    }

    private async lockApp() {
        const createLock = () => {
            this.lockManager.deleteLockFile(LockManager.createLockFileName(this.id))
            this.lockManager.createLockFile(this.id, process.pid.toString())
        }

        const lock = this.lockManager.createLockFile(this.id, process.pid.toString())
        if (!lock) {
            if (await this.isPreviousRunning()) {
                throw new Error("Application.lockApp() application with spame id already running")
            }
        }
        createLock()
    }

}
