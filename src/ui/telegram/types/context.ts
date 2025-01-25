import { NarrowedContext, Context, Types } from "telegraf";
import { IManager } from "db/schemes";
import { Session } from "ui/telegram/types/session";
import { AvailableUIsEnum, BaseUIContext } from "ui/types";

export interface TgContext extends Context, BaseUIContext {
    type: AvailableUIsEnum.Telegram
    manager: IManager
    session?: Session
    text: string
}

export type CqContext = NarrowedContext<
        TgContext & { match: RegExpExecArray; },
        Types.MountMap['callback_query']
    >;
