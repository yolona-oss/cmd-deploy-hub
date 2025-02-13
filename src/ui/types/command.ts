import { BaseCommandService } from "services/command-service"

/**
 * @description Describes the UI commands mapping
 */
interface BaseCommand {
    command: string
    description: string
    args?: string[]
}

/**
 * @description Describes the UI commands mapping with execution handler and sequence connections with other commands
 */
export interface IUICommand<ThisUI, CtxType> extends BaseCommand {
    fn: (this: ThisUI, ctx: CtxType) => Promise<void> |
        BaseCommandService<any>

    next?: string[]
    prev?: string
}

export type IUICommandSimple = BaseCommand
