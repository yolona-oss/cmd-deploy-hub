export function sleep(ms: number) { return new Promise(resolve => setTimeout(resolve, ms)); }

export function timeoutPromise(timeout: number): Promise<void> {
    return new Promise(function(_, reject) {
        setTimeout(function() {
            reject("Timeout")
        }, timeout)
    })
}
export async function randSleep(max: number = 1000, min: number = 100) {
    let ms = Math.round(Math.random() * (max-min) + min)
    return await sleep(ms)
}

export module time {
    export type HMSTime = {
        hour: number,
        minutes: number,
        seconds: number,
        milliseconds: number,
    }

    export function add(time: Partial<HMSTime>, date = new Date()) {
        let copy = new Date(date)
        return new Date(copy.setTime(copy.getTime() +
                                     ( time.hour ?? 0) * 3600000 +
                                     ( time.minutes ?? 0) * 6000 +
                                     ( time.seconds ?? 0) * 1000) +
                                     ( time.milliseconds ?? 0))
    }

    export function toDate(date: any) {
        if (date === void 0) {
            return new Date(0);
        }
        if (isDate(date)) {
            return date;
        } else {
            return new Date(parseFloat(date.toString()));
        }
    }

    export function isDate(date: any) {
        return (date instanceof Date);
    }

    export function format(date: any, format: string) {
        var d = toDate(date);
        return format
        .replace(/Y/gm, d.getFullYear().toString())
        .replace(/m/gm, ('0' + (d.getMonth() + 1)).substr(-2))
        .replace(/d/gm, ('0' + (d.getDate() + 1)).substr(-2))
        .replace(/H/gm, ('0' + (d.getHours() + 0)).substr(-2))
        .replace(/i/gm, ('0' + (d.getMinutes() + 0)).substr(-2))
        .replace(/s/gm, ('0' + (d.getSeconds() + 0)).substr(-2))
        .replace(/v/gm, ('0000' + (d.getMilliseconds() % 1000)).substr(-3));
    }

    export function rawMS(time: Partial<HMSTime>) {
        return ( time.hour ?? 0) * 3600000 +
            ( time.minutes ?? 0) * 6000 +
            ( time.seconds ?? 0) * 1000 +
            ( time.milliseconds ?? 0)
    }
}
