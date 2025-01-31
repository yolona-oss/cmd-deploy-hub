import { getInitialConfig } from "config";
import log from 'utils/logger'
import * as fs from 'fs'
import path from 'path'

import { ExCurve, ExCurveTradePoints } from "./curve";

export class BotDrivenCurve extends ExCurve {
    constructor(initial?: ExCurveTradePoints) {
        super(initial)
    }

    static loadFromFile(id: string) {
        const cfg = getInitialConfig()

        const dir = path.join(cfg.server.database.path, "ex-curve")
        const file = path.join(dir, `${id}.json`)
        if (fs.existsSync(dir)) {
            if (fs.existsSync(file)) {
                const data = fs.readFileSync(file, 'utf8')
                const arr: Array<any> = JSON.parse(data)
                return new BotDrivenCurve(arr)
            }
        }

        log.error("File not found: " + file, ". Creating new curve...")
        return new BotDrivenCurve()
    }

    saveToFile(id: string) {
        const cfg = getInitialConfig()

        const dir = path.join(cfg.server.database.path, "ex-curve")
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true })
        }

        const file = path.join(dir, `${id}.json`)
        try {
            fs.writeFileSync(file, JSON.stringify(this.trades))
            return true
        } catch (e) {
            log.error(`Error saving ex-curve to file: ${e}`)
            return null
        }
    }
}
