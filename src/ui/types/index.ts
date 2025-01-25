export { type IUI } from "ui/types/ui";
export { type IUICommand, type IUICommandSimple } from 'ui/types/command'
export { type BaseUIContext } from 'ui/types/context'

import { IUICommand } from "ui/types";

export function mapCommands<ThisUI, CtxType>(commands: IUICommand<ThisUI, CtxType>[])/*: IUICommandSimple[] */{
    return commands.map(cmd => ({
        command: cmd.command,
        description: cmd.description
    }))
}

export type AvailableUIsType = "telegram" | "cli"

export const enum AvailableUIsEnum {
    Telegram = "telegram",
    CLI = "cli",
}
