import * as tg from "telegraf";
import { CqContext } from "ui/telegram/types";
import { getConfig } from "config";
import { Manager, FilesWrapper } from "db";
import { TelegramUI } from "ui/telegram";
import { cb_data } from "ui/telegram/constants/callback";

export let actions = (() => {

    async function approverequest(this: TelegramUI, ctx: CqContext, next: () => void) {
        let id = ctx.match.input.slice(cb_data.approveRequest.length);
        let keyboard = tg.Markup.inlineKeyboard([
            [
                {
                    text: "Approve",
                    callback_data: cb_data.approveManager + " " + id
                },
                {
                    text: "Reject",
                    callback_data: cb_data.rejectManager + " " + id
                }
            ]
        ])

        await ctx.telegram.sendMessage((await getConfig()).bot.admin_id, "Approve request from @" + ctx.from!.username,
            keyboard);
        next();
    }

    async function approvemanager(this: TelegramUI, ctx: CqContext, next: () => void) {
        let userId = Number(ctx.match.input.slice(cb_data.approveManager.length));
        let member = await this.tgBotInstance.telegram.getChatMember(userId, userId);
        await Manager.create({
            userId: userId,
            name: member.user.first_name + " " + member.user.last_name,
            avatar: (await FilesWrapper.getDefaultAvatar())!.id,
            useGreeting: true
        })

        await this.tgBotInstance.telegram.sendMessage(userId, "Your request have been accepted. Now you are can use this bot");
        next();
    }

    async function rejectmanager(this: TelegramUI, ctx: CqContext, next: () => void) {
        let userId = Number(ctx.match.input.slice(cb_data.rejectManager.length));
        await this.tgBotInstance.telegram.sendMessage(userId, "Your request have been rejected");
        // this.bot.telegram.sendSticker(userId, this.stickers.evil);
        next();
    }

    return {
        approverequest,
        approvemanager,
        rejectmanager
    }
})()

