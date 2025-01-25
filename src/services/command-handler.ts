import { DefaultSeqCommandsEnum, DefaultServiceCommandsEnum } from "constants/command";
import { WithInit } from "types/with-init";
import { BaseUIContext, IUICommandSimple } from "ui/types";
import { Node, Graph, printGraph } from "utils/graf";
import { WithNeighbors } from "types/with-neighbors";
import { SequenceHandler } from "./sequence-handler";
import log from 'utils/logger'

export type IHandler<Ctx> = (ctx: Ctx) => Promise<string|void>

interface IHandleCallback<Ctx> extends Partial<WithNeighbors> {
    fn: IHandler<Ctx>
    isService?: boolean
    description: string
    args?: string[]
}

type IHandlerCommand = IUICommandSimple & Partial<WithNeighbors>

// TODO its have tooooooooooooo many if else
export class CommandHandler<TContext extends BaseUIContext> extends WithInit {
    private callbacks: Map<string, IHandleCallback<TContext>>
    private sequenceHandler?: SequenceHandler

    private activeServices: Map<string, Array<string>> = new Map() // userId -> services

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
                isService: command.isService,
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

        if (command === DefaultServiceCommandsEnum.STOP_COMMAND) {
            const splited = ctx.text!.trim().split(" ")
            if (splited.length <= 1) {
                return "No service name passed"
            }
            const service = splited[1]
            if (this.activeServices.get(String(userId))!.includes(service)) {
                this.activeServices.get(String(userId))!.
                    splice(
                        this.activeServices.get(String(userId))!.indexOf(service),
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

        if (cb.isService) {
            if (!this.activeServices.has(String(userId))) {
                this.activeServices.set(String(userId), [])
            }

            if (!ctx.text) {
                return "Service name required(Context currupted?)"
            }

            const splited = ctx.text!.trim().split(" ")
            if (splited.length <= 1) {
                return "No service name passed"
            }
            const service = splited[1]
            if (this.activeServices.get(String(userId))!.includes(service)) {
                return `Service ${command} already active.`
            }

            this.activeServices.get(String(userId))!.push(command)
        }

        try {
            return await cb.fn(ctx);
        } catch (e) {
            return JSON.stringify(e, null, 4)
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

    private getArgs(text: string) {
        const splited = text.trim().split(" ")
        return splited.slice(1)
    }
}
