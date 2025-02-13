import { Application } from "application";
import { getInitialConfig } from "config";
import { CommandHandler } from "services/command-handler";
import { AvailableUIsEnum, AvailableUIsType, BaseUIContext, IUI } from "ui";
import { CLIContext, CLIUI } from "ui/cli";
import { TelegramUI, TgContext } from "ui/telegram";

import crypto from 'crypto'

import log from 'utils/logger'

export class AppCmdhub extends Application<BaseUIContext> {
    constructor(
        ui_name: AvailableUIsType,
        cmdHandler: CommandHandler<any>
    ) {
        const cfg = getInitialConfig()

        if (!cmdHandler.isInitialized()) {
            log.error("Command handler must be initialized before starting app")
            process.exit(-1)
        }
        
        log.echo("Initializing UI...")
        let selected_ui: IUI<any>
        switch (ui_name) {
            case "telegram":
                selected_ui = new TelegramUI(cfg.bot.token, cmdHandler as CommandHandler<TgContext>)
                break
            case "cli":
                selected_ui = new CLIUI(cmdHandler as CommandHandler<CLIContext>)
                break
            default:
                log.error(`Unknown UI: ${ui_name}`)
                process.exit(-1)
        }

        super("cmdhub", selected_ui)
    }

    async Initialize(): Promise<void> {
        await super.Initialize()

        log.echo(`Initializing Application with UI: ${this.ui.ContextType()}...`)

        //log.echo("Creating lock file for UI...")
        //const locked = this.ui.lock(this.lockManager)
        //if (!locked) {
        //    log.error("Application with same UI already running")
        //    process.exit(-1)
        //}

        super.setInitialized()
    }
}
