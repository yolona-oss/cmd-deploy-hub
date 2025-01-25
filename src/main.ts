import cmdhub from 'cmdhub'
import { CommandHandler } from 'services/command-handler'
import { TgContext } from 'ui/telegram'

let handler = new CommandHandler<TgContext>()
handler.register({
    command: "a",
    description: "b",
    prev: "ff"
},
    async function(ctx: TgContext) {
        ctx.reply("fffffffffff")
    }
)

handler.register({
    command: "ff",
    description: "bbbbbbbb",
    next: ["a"]
},
    async function(ctx: TgContext) {
        ctx.reply("call next /a")
    }
)

handler.done()

cmdhub("telegram", handler)
