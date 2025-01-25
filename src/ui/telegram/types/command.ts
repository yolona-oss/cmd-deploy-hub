import { NarrowedContext, Types } from "telegraf";
import { TgContext } from "./context";
import { IUICommand } from "ui/types";
import { TelegramUI } from "ui/telegram";

export type TextContext = NarrowedContext<TgContext, Types.MountMap['text']>;

export interface TgCommand extends IUICommand<TelegramUI, TextContext> {
    fn: (this: TelegramUI, ctx: TextContext) => Promise<void>;
    command: string;
    description: string;
    args: string[];
}
