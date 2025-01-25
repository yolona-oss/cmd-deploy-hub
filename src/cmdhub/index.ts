import { Application } from "application";
import { getConfig } from "config";
import log from 'utils/logger'
import { CommandHandler } from "services/command-handler";

import { IUI, AvailableUIsType } from 'ui/types';
import { TelegramUI } from "ui/telegram";
import { CLIUI } from "ui/cli";

import * as crypto from 'crypto'

export default async function(uiName: AvailableUIsType, cmdHandler: CommandHandler<any>) {

    if (!cmdHandler.isInitialized()) {
        throw new Error("Command handler must be initialized before starting app")
    }

    log.echo("Loading config...")
    const cfg = await getConfig()

    log.echo("Initializing UI...")
    let curUI: IUI<any>
    switch (uiName) {
        case "telegram":
            log.echo("Initializing Telegram UI...")
            curUI = new TelegramUI(cfg.bot.token, cmdHandler)
            break
        case "cli":
            log.echo("Initializing CLI UI...")
            curUI = new CLIUI(cmdHandler)
            break
        default:
            throw new Error(`Unknown UI: ${uiName}`)
    }

    log.echo("Starting app...")
    const app = new Application("cmd-deploy-hub", curUI)

    if (uiName === "telegram") {
        log.echo("Creating lock file for UI...")
        const locked = app.lockManager.createLockFile(crypto.hash("sha256", cfg.bot.token))
        if (!locked) {
            log.error("Application with same UI already running")
            app.terminate()
            process.exit(-1)
        }
    }

    log.echo("Running app...")
    app.run()
}
