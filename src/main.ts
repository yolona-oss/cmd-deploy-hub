import { AppCmdhub } from 'cmdhub'
import { CommandHandler } from 'services/command-handler'
import { BaseCommandService } from 'services/command-service'
import { TgContext } from 'ui/telegram'
import { genRandomNumberBetweenWithScatter } from 'utils/random'
import { sleep } from 'utils/time'

import log from 'utils/logger'
import { example } from 'bot/traider/impl/example'

class ServiceOne extends BaseCommandService<{}, string> {
    constructor(userId: string, name: string = 'blob') {
        super(userId, {}, name)
    }

    clone(userId: string, newName?: string): BaseCommandService<{}, string> {
        return new ServiceOne(userId, newName)
    }

    async run() {
        await super.run()

        let i = 3
        while (true) {
            if (!super.isRunning()) {
                break
            }
            this.emit("message", "blob" + i)
            i = i + genRandomNumberBetweenWithScatter<number>(-199, 320, 30, 2)
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
        new ServiceOne("")
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
    //await example()
    let handler = new CommandHandler<TgContext>()
    setup(handler)
    handler.done()

    const app = new AppCmdhub("cli", handler)

    app.setErrorInterceptor(function(error: Error) {
        log.error(error)
    })
    await app.Initialize()

    await app.run()
}

bootstrap()
