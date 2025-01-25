import { CommandHandler } from "services/command-handler"
import { IRunnable } from "types/runnable"
import { WithInit } from "types/with-init"
import { BaseUIContext } from "ui/types/context"
import { AvailableUIsType } from "ui/types"

export interface IUI<CtxType extends BaseUIContext> extends IRunnable, WithInit {
    readonly commandHandler: CommandHandler<CtxType>

    ContextType(): AvailableUIsType
}
