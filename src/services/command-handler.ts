import {
    DefaultSeqCommandsEnum,
    DefaultServiceCommandsEnum,
    DefaultAccountCommandsEnum,
} from "constants/command";
import { assignToCustomPath, extractValueFromObject } from 'utils/object'
import { IAccount } from "db";
import { WithInit } from "types/with-init";
import { BaseUIContext, IUICommandSimple } from "ui/types";
import { Node, Graph, printGraph } from "utils/graf";
import { WithNeighbors } from "types/with-neighbors";
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

// TODO its have tooooooooooooo many if else
export class CommandHandler<TContext extends BaseUIContext> extends WithInit {
    private callbacks: Map<string, IHandleCallback<TContext>>
    private sequenceHandler?: SequenceHandler

    private activeServices: Map<string, Array<BaseCommandService<any>>> = new Map() // userId -> services

    constructor() {
        super()
        this.callbacks = new Map();
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

    // return error string or void on success
    //
    // TODO its tooooooo huge and rediculus func(((((((((~_~)))))))))
    public async handleCommand(command: string, ctx: TContext): Promise<string | void> {
        const cb = this.callbacks.get(command);
        const arg = this.getArgs(ctx.text!)
        const _userId = ctx.manager?.userId
        const userId = ctx.manager!.userId

        if (!_userId) {
            return "No user id."
        }

        let err
        try {
            err = this.sequenceHandler!.handle(userId, command)
        } catch (e) {
            log.error(`Sequence handling error: ` + JSON.stringify(e, null, 4))
            err = JSON.stringify(e, null, 4)
        }
        if (err) { // err or default seq comands passed :) im too smart :_)
            return err
        }

        switch (command) {
            case DefaultAccountCommandsEnum.CREATE_VARIABLE:
                let curData = (await ctx.manager!.populate<{account: IAccount}>("account")).account.data
                const assignedData = assignToCustomPath(curData, arg[0], arg[1])
                await ctx.manager!.updateOne({ account: { data: assignedData }})
                return "Variable created. Current data for context:\n" + JSON.stringify(assignedData, null, 4)
            case DefaultAccountCommandsEnum.REMOVE_VARIABLE:
                return "Not implemented."
        }

        // stop services
        if (command === DefaultServiceCommandsEnum.STOP_COMMAND) {
            const splited = ctx.text!.trim().split(" ")
            if (splited.length <= 1) {
                return "No service name passed"
            }
            const service = splited[1]
            if (this.activeServices.get(String(userId))!.map(serv => serv.name).includes(service)) {
                await this.activeServices.get(String(userId))!.
                find(serv => serv.name === service)!.terminate()
                this.activeServices.get(String(userId))!.
                    splice(
                        this.activeServices.get(String(userId))!.map(serv => serv.name).indexOf(service),
                        1
                    )
                return "Service stopped."
            } else {
                return `Service ${service} not active.`
            }
        }

        if (!cb) {
            return 'Unknown command.';
        }

        // register services
        if (cb.fn instanceof BaseCommandService || typeof cb.fn === 'object' || typeof cb.fn !== 'function') {
            const serviceName = cb.fn.name

            // initialize activeServices for userId
            if (!this.activeServices.has(String(userId))) {
                this.activeServices.set(String(userId), [])
            }

            if (this.activeServices.get(String(userId))!.map(serv => serv.name).includes(serviceName)) {
                return `Service ${command} already active.`
            }

            this.activeServices.get(String(userId))!.push(cb.fn)
        }

        try {
            if (typeof cb.fn === 'function') {
                return await cb.fn(ctx);
                //} else if (typeof cb.fn === 'object'/* && cb.fn instanceof BaseCommandService*/) {
            } else if (cb.fn) {
                cb.fn.on("message", async (message: string) => {
                    await this.sendMessageToContext(ctx, message)
                })
                cb.fn.on('done', async () => {
                    await this.handleServiceDone(String(userId), cb.fn.name, ctx)
                })
                log.echo("-- Starting service: " + cb.fn.name)
                cb.fn.run()
            }
        } catch (e) {
            return JSON.stringify(e, null, 4)
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


    public mapHandlersToCommands(): IUICommandSimple[] {
        const cmd = this.callbacks.keys().toArray()
        const desc = this.callbacks.values().map(v => v.description).toArray()
        const args = this.callbacks.values().map(v => v.args).toArray()

        return new Array(cmd.length)
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
                    command: DefaultAccountCommandsEnum.CREATE_VARIABLE,
                    description: "Create variable for user execution context",
                    args: ["path", "value"]
                },
                {
                    command: DefaultAccountCommandsEnum.REMOVE_VARIABLE,
                    description: "Remove variable for user execution context",
                    args: ["path"]
                }
            ])
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

    done() {
        const graph = this.createCommandSequenceGraph();

        printGraph(graph)

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

    private getArgs(text: string): string[] {
        const splited = text.trim().split(" ")
        return splited.slice(1)
    }
}
