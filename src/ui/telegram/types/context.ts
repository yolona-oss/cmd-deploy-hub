import { NarrowedContext, Context, Types } from "telegraf";
import { IManager } from "db/schemes";
import { AvailableUIsEnum, BaseUIContext } from "ui/types";

export interface TgContext extends Context, BaseUIContext {
    type: AvailableUIsEnum.Telegram
    manager: IManager
    text: string
    reply: (...args: any[]) => Promise<any>
}

export type CqContext = NarrowedContext<
        TgContext & { match: RegExpExecArray; },
        Types.MountMap['callback_query']
    >;
