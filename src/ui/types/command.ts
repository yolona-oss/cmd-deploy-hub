import { BaseCommandService } from "services/command-service"

interface BaseCommand {
    command: string
    description: string
    args?: string[]
    accountData?: {
        path: string
        name: string
    }[]
}

export interface IUICommand<ThisUI, CtxType> extends BaseCommand {
    fn: (this: ThisUI, ctx: CtxType) => Promise<void> |
        BaseCommandService

    next?: string[]
    prev?: string
}

export type IUICommandSimple = BaseCommand
