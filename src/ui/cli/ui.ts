import readline from 'readline';
import { CLIContext } from 'ui/cli/types';
import { CommandHandler } from 'services/command-handler';

import log from 'utils/logger'

import { IUI } from 'ui/types'
import { WithInit } from 'types/with-init';
import { AvailableUIsEnum, AvailableUIsType } from 'ui/types';

export class CLIUI extends WithInit implements IUI<CLIContext> {
    private context: CLIContext;

    private isActive: boolean = false

    private cmds: string[]

    constructor(
        public readonly commandHandler: CommandHandler<CLIContext>
    ) {
        super()
        this.context = {
            type: AvailableUIsEnum.CLI,
            userInput: '',
            userSession: { state: '', data: {} },
            sendOutput: (output: string) => {
                console.log(":: " + output); // Print output to console
            }
        };
        this.cmds = this.commandHandler.mapHandlersToCommands().map(cmd => cmd.command)
        this.setInitialized()
    }

    ContextType(): AvailableUIsType {
        return AvailableUIsEnum.CLI
    }

    isRunning(): boolean {
        return this.isActive
    }

    async registerCommands(commandHandler: CommandHandler<CLIContext>) {
        commandHandler
    }

    async run() {
        if (!this.isInitialized()) {
            throw new Error("CLIUI::run() not initialized")
        }

        if (this.isActive) {
            throw new Error("CLIUI::run() already running")
        }

        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
            prompt: 'cmdhub> ',
            completer: (line: string) => {
                const completions = this.cmds.filter((c) => c.startsWith(line));
                return completions
            }
        });

        log.echo("Starting CLI...")

        rl.on('line', async (line) => {
            this.context.userInput = line;
            const [command, ...args] = line.split(' ');
            this.context.userSession.data.args = args; // Save args in context

            const response = await this.commandHandler!.handleCommand(command, this.context);
            if (response) {
                this.context.sendOutput(response);
            }
        });

        this.isActive = true
    }

    async terminate() {
        if (!this.isActive) {
            throw new Error("CLIUI::terminate() not running")
        }
        this.isActive = false
    }
}