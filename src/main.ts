import { AppCmdhub } from 'cmdhub'
import { CommandHandler } from 'services/command-handler'
import { BaseCommandService } from 'services/command-service'
import { TgContext } from 'ui/telegram'
import { genRandomNumberBetween } from 'utils/random'
import { sleep } from 'utils/time'

import log from 'utils/logger'
import { example } from 'bot/traider/impl/example'

class ServiceOne extends BaseCommandService<string> {
    constructor() {
        super("blob-service")
    }

    async run() {
        await super.run()

        let i = 3
        while (true && super.isRunning()) {
            this.emit("message", "blob" + i)
            i = i + genRandomNumberBetween(-199, 320)
            await sleep(1000)
            if (i > 1000) {
                await this.terminate()
            }
        }
    }
}

function setup(handler: CommandHandler<TgContext>) {
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

    handler.register({
        command: "blob",
        description: "Fuck",
    },
        new ServiceOne()
    )

    handler.register({
        command: "example",
        description: "run example trade pattern",
    }, async function(ctx: TgContext) {
            await ctx.reply("example")
            await example()
            await ctx.reply("done")
    })
}

process.on('uncaughtException', (err, origin) => {
    console.log(origin)
    log.error("Uncaught exception", err)
})
process.on('unhandledRejection', (err, promise) => {
    console.log(promise)
    log.error("Unhandled rejection", err)
})

async function bootstrap() {
    await example()
    //let handler = new CommandHandler<TgContext>()
    //setup(handler)
    //handler.done()
    //
    //const app = new AppCmdhub("cli", handler)
    //
    //app.setErrorInterceptor((error: Error) => {
    //    log.error(error)
    //})
    //app.Initialize()
    //app.run()
}

bootstrap()
