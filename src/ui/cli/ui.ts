import readline from 'readline';
import { CLIContext } from 'ui/cli/types';
import { CommandHandler } from 'services/command-handler';

import log from 'utils/logger'

import { IUI } from 'ui/types'
import { WithInit } from 'types/with-init';
import { AvailableUIsEnum, AvailableUIsType } from 'ui/types';
import { LockManager } from 'utils/lock-manager';
import { FilesWrapper, Manager } from 'db';

export class CLIUI extends WithInit implements IUI<CLIContext> {
    private context: CLIContext;
    private rl?: readline.Interface
    private isActive: boolean = false
    private cmds: string[]

    constructor(
        public readonly commandHandler: CommandHandler<CLIContext>
    ) {
        super()
        this.context = {
            type: AvailableUIsEnum.CLI,
            //manager: {},
            userSession: { state: '', data: {} },
            text: "",
            reply: async (message: string) => {
                console.log('[' + new Date().toLocaleTimeString("ru") + ']' + "[CLI] < " + message);
            }
        };
        this.cmds = this.commandHandler.mapHandlersToCommands().map(cmd => cmd.command)
        console.log(this.cmds)
        this.setInitialized()
    }

    lock(_: LockManager): boolean {
        return true
    }

    unlock(_: LockManager): boolean {
        return true
    }

    ContextType(): AvailableUIsType {
        return AvailableUIsEnum.CLI
    }

    isRunning(): boolean {
        return this.isActive
    }

    async run() {
        if (!this.isInitialized()) {
            throw new Error("CLIUI::run() not initialized")
        }

        if (this.isActive) {
            throw new Error("CLIUI::run() already running")
        }

        let manager = await Manager.findOne({userId: -1})
        if (!manager) {
            manager = await Manager.create({
                isAdmin: true,
                name: "CliAdmin",
                userId: -1,
                online: false,
                avatar: (await FilesWrapper.getDefaultAvatar())!.id,
                useGreeting: true
            })
        }
        this.context.manager = manager

        this.rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
            historySize: 100,
            prompt: "[CLI] >",
            completer: (line: string) => {
                const completions = this.cmds.filter((c) => c.startsWith(line));
                return completions
            }
        });

        log.echo("Starting CLI...")

        this.rl.on('line', async (line) => {
            this.context.text = line;
            const [command, ...args] = line.split(' ');
            this.context.userSession.data.args = args; // Save args in context

            const response = await this.commandHandler!.handleCommand(command, this.context);
            if (response) {
                this.context.reply(response);
            }
        });

        this.isActive = true
    }

    async terminate() {
        if (!this.isActive) {
            throw new Error("CLIUI::terminate() not running")
        }
        if (this.rl) {
            this.rl.close()
        }
        await this.commandHandler.stop()
        this.isActive = false
        log.echo(" -- CLI ui stopped");
    }
}
