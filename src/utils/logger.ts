import { appendFileSync } from 'fs'
import chalk from 'chalk'
import { createDirIfNotExist } from 'utils/fs-tools'

function logTime() {
    return '[' + new Date().toLocaleTimeString("ru") + ']'
}

createDirIfNotExist("./.log")

const logFileName = "./.log/" +
    new Date()
        .toLocaleDateString("ru") +
    "_" +
    new Date()
        .toLocaleTimeString("ru")

type ExtendedLog = {
    (...arg: any[]): void,
    echo:  (...arg: any[]) => void
    error: (...arg: any[]) => void
    warn: (...arg: any[]) => void
}
let log = <ExtendedLog>function(...arg: any[]): void {
    try {
        appendFileSync(logFileName, logTime() + ' - ' + arg.join(" ") + "\n")
    } catch (e) {
        console.error(e)
    }
}

log.error = function(...arg: any[]) {
    log("ERROR:", ...arg)

    console.error(logTime(), '[EE]:', chalk.red(...arg))
    //console.error(logTime(), '[EE]:', ...arg)
}

log.warn = function(...arg: any[]) {
    log("WARNING:", ...arg)
    console.warn(logTime(), '[WW]:', chalk.yellow(...arg))
    //console.warn(logTime(), '[WW]:', ...arg)
}

log.echo = function(...arg: any[]) {
    log(...arg)
    console.log(logTime(), '[II]:', ...arg)
}

export default log
