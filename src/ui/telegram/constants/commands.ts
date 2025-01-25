import { FilesWrapper } from 'db';
import { TelegramUI } from 'ui/telegram'
import { TgCommand, TextContext } from 'ui/telegram/types'

export const DefaultTgUICommands: TgCommand[] = [
    {
        command: "start",
        description: "Start command",
        args: [],
        fn: async function(this: TelegramUI, ctx: TextContext) {
            await ctx.reply("Hello, dummy comman here :)");
        }
    },
    {
        command: "setname",
        description: "Set your name",
        args: ["name"],
        fn: async function(this: TelegramUI, ctx: TextContext) {
            let name = "";
            if (ctx.message && ctx.message.text) {
                name = String(ctx.message.text.slice('setname'.length+2)).trim();
            }
            if (name !== "") {
                await ctx.manager.updateOne({ $set: { name: name } });
                await ctx.reply("Now your will called " + name);
            } else {
                await ctx.reply('No string passed, try: "/setname The Emperor"');
            }
        }
    },
    {
        command: "updateavatar",
        description: "Update your avatar",
        args: [],
        fn: async function(this: TelegramUI, ctx: TextContext) {
            let photos = await ctx.telegram.getUserProfilePhotos(ctx.from.id, 0, 1);
            let file   = await ctx.telegram.getFile(photos.photos[0][0].file_id);
            let url    = await ctx.telegram.getFileLink(file.file_id);
            let l_file = await FilesWrapper.saveFile(url.href, "avatars");
            if (l_file) {
                await ctx.manager.updateOne({ $set: { avatar: l_file.id } });
            } else {
                await ctx.reply("Loading error. Try another time ^_^");
            }
        }

    },
    {
        command: "gooffline",
        description: "Go offline",
        args: [],
        fn: async function(this: TelegramUI, ctx: TextContext) {
            await ctx.manager.updateOne({ $set: { online: false } });
        },
    },
    {
        command: "goonline",
        description: "Go online",
        args: [],
        fn: async function(this: TelegramUI, ctx: TextContext) {
            await ctx.manager.updateOne({ $set: { online: true } });
        },
    },
    {
        command: "status",
        description: "Get your status",
        args: [],
        fn: async function(this: TelegramUI, ctx: TextContext) {
            await ctx.reply("Your status: " + (ctx.manager.online ? "online" : "offline"))
        }
    },
    {
        command: "setgreeting",
        description: "On or Off bot startup greeting",
        args: ["on", "off"],
        fn: async function(this: TelegramUI, ctx: TextContext) {
            await ctx.manager.updateOne({ $set: { useGreeting: (ctx.message.text.includes("on")) } });
            await ctx.reply("Startup greeting: " + (ctx.manager.useGreeting ? "on" : "off"))
        }
    }
]
