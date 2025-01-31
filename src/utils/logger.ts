import { appendFileSync } from 'fs'
import chalk from 'chalk'
import { createDirIfNotExist } from 'utils/fs-tools'
import {getInitialConfig} from 'config'

//export enum LoggingLevel {
//    Trace = 0,
//    Debug = 1,
//    Warning = 2,
//    Error = 3,
//    Fatal = 4,
//}
//
//function strToLogLevel(str: string): LoggingLevel {
//    switch (str) {
//        case "Trace":
//            return LoggingLevel.Trace;
//        case "Debug":
//            return LoggingLevel.Debug;
//        case "Warning":
//            return LoggingLevel.Warning;
//        case "Error":
//            return LoggingLevel.Error;
//        case "Fatal":
//            return LoggingLevel.Fatal;
//        default:
//            throw new Error("Unknown log level: " + str);
//    }
//}
//
//const g_logginLevel: LoggingLevel = strToLogLevel(getInitialConfig().log_level);

function logTime() {
    return '[' + new Date().toLocaleTimeString() + ']'
}

createDirIfNotExist("./.log")

const logFileName = "./.log/" +
    new Date()
        .toLocaleDateString() +
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

    }
}

log.error = function(...arg: any[]) {
    log("ERROR:", ...arg)

    console.error(logTime(), '[EE]:', chalk.red(...arg))
}

log.warn = function(...arg: any[]) {
    log("WARNING:", ...arg)
    console.warn(logTime(), '[WW]:', chalk.yellow(...arg))
}

log.echo = function(...arg: any[]) {
    log(...arg)
    console.log(logTime(), '[II]:', ...arg)
}

export default log
