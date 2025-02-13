import {
    DefaultSeqCommandsEnum,
    DefaultServiceCommandsEnum,
    DefaultAccountCommandsEnum,
    DefaultHelpCommandsEnum,
} from "constants/command";
import { Account } from "db";
import { WithInit } from "types/with-init";
import { BaseUIContext, IUICommandSimple } from "ui/types";
import { Node, Graph, printGraph } from "utils/graf";
import { WithNeighbors, validateWithNeighborsMap } from "types/with-neighbors";
import { SequenceHandler } from "./sequence-handler";
import log from 'utils/logger'
import { BaseCommandService } from "./command-service";

export type IHandlerFunction<Ctx> = (ctx: Ctx) => Promise<string|void>
export type IHandlerService = BaseCommandService<any>

export type IHandler<Ctx> = IHandlerFunction<Ctx> | IHandlerService

interface IHandleCallback<Ctx> extends Partial<WithNeighbors> {
    fn: IHandler<Ctx>
    description: string
    args?: string[]
}

type IHandlerCommand = IUICommandSimple & Partial<WithNeighbors>

const DefaultCommands = [
    ...Object.values(DefaultSeqCommandsEnum),
    ...Object.values(DefaultServiceCommandsEnum),
    ...Object.values(DefaultAccountCommandsEnum),
    ...Object.values(DefaultHelpCommandsEnum)
]

// TODO its have tooooooooooooo many if else
export class CommandHandler<TContext extends BaseUIContext> extends WithInit {
    private callbacks: Map<string, IHandleCallback<TContext>> // name -> callback
    private sequenceHandler?: SequenceHandler

    private activeServices: Map<string, Array<BaseCommandService<any>>> = new Map() // userId -> services

    constructor() {
        super()
        this.callbacks = new Map();
    }

    done() {
        const graph = this.createCommandSequenceGraph();

        printGraph(graph)

        if (!validateWithNeighborsMap(this.callbacks)) {
            throw new Error("CommandHandler::done() invalid callbacks map");
        }

        const targets = this.callbacks.keys().toArray()
        const naighbors = this.callbacks.values().toArray()
        this.sequenceHandler = new SequenceHandler(
            Array.from(
                targets.map((v, i) =>
                    ({
                        target: v,
                        next: naighbors[i].next,
                        prev: naighbors[i].prev
                    })
                )
            )
        )

        this.setInitialized()
    }

    async stop() {
        for (const [userId, services] of this.activeServices) {
            log.echo(" -- Stoping services for user: " + userId)
            const terminatePromises = []
            for (const s of services) {
                log.echo("  -- terminating service: " + s.name)
                await s.terminate()
                terminatePromises.push(
                    new Promise(resolve => s.on("done", resolve))
                )
            }
            await Promise.all(terminatePromises)
            log.echo("  -- All services for user: " + userId + " stopped")
        }
        log.echo(" -- All services stopped")
    }

    public registerMany(commands: Array<{
        commands: IHandlerCommand,
        handlers: IHandler<TContext>
    }>) {
        commands.forEach(cmd => this.register(cmd.commands, cmd.handlers))
    }

    public register(command: IHandlerCommand, handler: IHandler<TContext>) {
        this.callbacks.set(
            command.command,
            {
                fn: handler,
                description: command.description,
                args: command.args,
                next: command.next,
                prev: command.prev
            }
        );
    }

    /**
     * @returns {Promise<string|void>} on success return nothing, otherwise return error message string
     */
    public async handleCommand(command: string, ctx: TContext): Promise<string | void> {
        const cb = this.callbacks.get(command);
        const arg = this.getArgs(ctx.text!)
        const _userId = ctx.manager?.userId
        const userId = String(_userId)

        if (!_userId) {
            return "CommandHandler.handleCommand() No user id."
        }

        if (!cb && !DefaultCommands.includes(command)) {
            return 'CommandHandler.handleCommand() Unknown command "' + command + '".';
        }

        // ---- Builtin cmd handling START
        // must be in this order sequence -> account -> service
        const defaultCmdHandlers = [
            this.handleHelpCommand,
            this.handleSequenceCommand,
            this.handleAccountCommand,
            this.handleServiceCommand,
        ]

        for (const handler of defaultCmdHandlers) {
            const res = await handler.bind(this)(command, ctx, userId, arg)
            if (res) {
                return res
            }
        }
        // ---- Builtin cmd handling END

        if (!cb) {
            return 'CommandHandler.handleCommand() Unknown command "' + command + '".';
        }

        try {
            if (typeof cb.fn === 'function') { // simple command
                return await cb.fn(ctx);
            } else if (cb.fn) { // service exe command
                //const serviceName = cb.fn.name
                const serviceName = command

                if (!this.activeServices.has(userId)) {
                    this.activeServices.set(userId, [])
                }

                if (this.activeServices.get(userId)!.map(serv => serv.name).includes(serviceName)) {
                    return `Service ${serviceName} already active.`
                }

                const serviceInstance = cb.fn.clone(userId, serviceName)
                this.activeServices.get(userId)!.push(serviceInstance)

                serviceInstance.on("message", async (message: string) => {
                    await this.sendMessageToContext(ctx, message)
                })
                //cb.fn.on("liveLog")
                serviceInstance.on('done', async () => {
                    await this.handleServiceDone(userId, serviceInstance.name, ctx)
                })
                log.echo("-- Starting service: " + serviceInstance.name)
                serviceInstance.run()
            }
        } catch (e: any) {
            log.error("CommandHandler.handleCommand() Command handling error: " + e)
            return String(e)
        }
    }

    private removeService(userId: string, serviceName: string) {
        this.activeServices.get(userId)!.splice(
            this.activeServices.get(userId)!.map(serv => serv.name).indexOf(serviceName),
            1
        )
    }

    private async handleServiceDone(userId: string, serviceName: string, ctx: TContext) {
        log.echo("-- Service done: " + serviceName)
        this.removeService(userId, serviceName)

        await this.sendMessageToContext(ctx, `Service ${serviceName} done.`)
    }

    private async sendMessageToContext(ctx: TContext, message: string) {
        if (ctx.reply) {
            await ctx.reply(message)
        } else {
            log.error(`No reply function in context. Unhandled message: "${message}"`)
        }
    }

    private getArgs(text: string): string[] {
        const splited = text.trim().split(" ")
        return splited.slice(1)
    }

    public mapHandlersToCommands(): IUICommandSimple[] {
        const cmd = this.callbacks.keys().toArray()
        const desc = this.callbacks.values().map(v => v.description).toArray()
        const args = this.callbacks.values().map(v => v.args).toArray()

        const mapped = new Array(cmd.length)
            .fill(0)
            .map((_, i) => ({command: cmd[i], description: desc[i], args: args[i]}))
            .concat([
                {
                    command: DefaultSeqCommandsEnum.NEXT_COMMAND,
                    description: "Proceed in current command sequnce.",
                    args: []
                },
                {
                    command: DefaultSeqCommandsEnum.BACK_COMMAND,
                    description: "Go back in current command sequnce.",
                    args: []
                },
                {
                    command: DefaultSeqCommandsEnum.CANCEL_COMMAND,
                    description: "Cancel current command sequnce.",
                    args: []
                }
            ])
            .concat([
                {
                    command: DefaultServiceCommandsEnum.STOP_COMMAND,
                    description: "Stop service with passed name <service-name>.",
                    args: ["service-name"]
                }
            ])
            .concat([
                {
                    command: DefaultAccountCommandsEnum.SET_VARIABLE,
                    description: "Create or update variable for user execution context",
                    args: ["service", "path", "value"]
                },
                {
                    command: DefaultAccountCommandsEnum.REMOVE_VARIABLE,
                    description: "Remove variable for user execution context",
                    args: ["service", "path"]
                },
                {
                    command: DefaultAccountCommandsEnum.GET_VARIABLE,
                    description: "Get variable for user execution context",
                    args: ["service", "path"]
                }
            ])
            .concat([
                {
                    command: DefaultHelpCommandsEnum.HELP_COMMAND,
                    description: "List all available commands.",
                    args: []
                },
                {
                    command: DefaultHelpCommandsEnum.CHELP_COMMAND,
                    description: "Print help for concreet command",
                    args: ["command"]
                }
            ])

        return mapped
    }

    public createCommandSequenceGraph() {
        const graph = new Graph();
        const nodeMap: Map<string, Node> = new Map();

        this.callbacks.forEach((callback, key) => {
            const node = new Node(callback);
            nodeMap.set(key, node);
            graph.nodes.push(node);
        });

        this.callbacks.forEach((callback, key) => {
            const currentNode = nodeMap.get(key);
            if (!currentNode) return;

            if (callback.next) {
                callback.next.forEach(nextKey => {
                    const nextNode = nodeMap.get(nextKey);
                    if (nextNode) {
                        graph.addEdge(currentNode, nextNode);
                    }
                });
            }

            if (callback.prev) {
                const prevNode = nodeMap.get(callback.prev);
                if (prevNode) {
                    graph.addEdge(currentNode, prevNode);
                }
            }
        });

        return graph;
    }

    /// Builtin defaults command execution handlers --- #START --- 
    private async handleHelpCommand(command: string, _: TContext, __: string, arg: string[]) {
        switch (command) {
            case DefaultHelpCommandsEnum.HELP_COMMAND:
                return this.mapHandlersToCommands().map(v =>
                    `Command: ${v.command},\
Description: ${v.description},\
Args: ${v.args?.join(", ")}\
`
                ).join("\n")
            case DefaultHelpCommandsEnum.CHELP_COMMAND:
                const cmd = this.callbacks.get(arg[0])
                if (!cmd) {
                    return `Command ${arg[0]} not found`
                }
                if (cmd.fn instanceof Function) {
                    return `Command ${arg[0]},\
Description: ${cmd.description},\
Args: ${cmd.args?.join(", ")}\
Next: ${cmd.next?.join(", ") ?? "None"}\
Prev: ${cmd.prev ?? "None"}\
`
                } else {
                    return `Service ${arg[0]},
Description: ${cmd.description},
Config: ${JSON.stringify(cmd.fn.configEntries(), null, 4)},
Next: ${cmd.next?.join(", ") ?? "None"}\
Prev: ${cmd.prev ?? "None"}\
`
                }
        }
        return null
    }

    private async handleAccountCommand(command: string, ctx: TContext, _: string, arg: string[]) {
        const account = await Account.findById(ctx.manager!.account)
        if (!account) {
            return "Account not found."
        }
        switch (command) {
            case DefaultAccountCommandsEnum.SET_VARIABLE:
                await account!.setModuleData(arg[0], arg[1], arg[2])

                return "Variable setted. Current data for context:\n" + JSON.stringify(account.modules.find(m => m.module === arg[0]), null, 4)
            case DefaultAccountCommandsEnum.REMOVE_VARIABLE:
                await account.unsetModuleData(arg[0], arg[1])

                return "Variable unsetted"
            case DefaultAccountCommandsEnum.GET_VARIABLE:
                return JSON.stringify(
                    await account.getModuleData(arg[0], arg[1]),
                    null,
                    4
                )
        }
        return null
    }

    private handleSequenceCommand(command: string, _: TContext, userId: string, __: string[]) {
        let seq_exe_error
        try {
            seq_exe_error = this.sequenceHandler!.handle(userId, command)
        } catch (e: any) {
            log.error(`CommandHandler.handleCommand() Sequence handling error: ` + e)
            seq_exe_error = e 
        }
        if (seq_exe_error) { // err or default seq comands passed :) im too smart :_)
            return seq_exe_error
        }
        return null
    }

    private async handleServiceCommand(command: string, ctx: TContext, userId: string, arg: string[]) {
        // stop services
        if (command === DefaultServiceCommandsEnum.STOP_COMMAND) {
            if (arg.length == 0) {
                return "No service name passed"
            }
            const serviceName = arg[0]
            const userServices = this.activeServices.get(userId)!
            const userServicesNames = userServices.map(s => s.name)
            if (userServicesNames.includes(serviceName)) {
                await userServices.find(serv => serv.name === serviceName)!.terminate()
                userServices.splice(userServicesNames.indexOf(serviceName), 1)
                return `Service "${serviceName}" stopped.`
            } else {
                return `Service ${serviceName} not active.`
            }
        }
        return null
    }

    /// Builtin defaults command execution handlers --- #END --- 
}
