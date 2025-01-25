interface BaseCommand {
    command: string
    description: string
    args?: string[]
    isService?: boolean
    accountData?: {
        path: string
        name: string
    }[]
}

export interface IUICommand<ThisUI, CtxType> extends BaseCommand {
    fn: (this: ThisUI, ctx: CtxType) => Promise<void>

    next?: string[]
    prev?: string
}

export type IUICommandSimple = BaseCommand
