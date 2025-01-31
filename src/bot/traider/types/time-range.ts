export type ExTimeRangeMin = "1m" | "3m" | "5m" | "15m" | "30m" | "45m"
export type ExTimeRangeHours = "1h" | "2h" | "3h" | "4h"
export type ExTimeRangeDays = "1d" | "1w" | "1mon"

export type ExTimeRange = ExTimeRangeMin | ExTimeRangeHours | ExTimeRangeDays

export interface TimeRangeValue {
    range: ExTimeRange
    start: bigint
    end: bigint
}

export function exTimeRangeToMilliseconds(range: ExTimeRange) {
    if (range.match(/m$/)) {
        return Number(range.replace(/m$/, "")) * 60 * 1000
    }

    if (range.match(/h$/)) {
        return Number(range.replace(/h$/, "")) * 60 * 60 * 1000
    }

    if (range.match(/d$/)) {
        return Number(range.replace(/d$/, "")) * 24 * 60 * 60 * 1000
    }

    if (range.match(/w$/)) {
        return Number(range.replace(/w$/, "")) * 7 * 24 * 60 * 60 * 1000
    }

    if (range.match(/mon$/)) {
        return Number(range.replace(/mon$/, "")) * 30 * 24 * 60 * 60 * 1000
    }

    return -1
}

export function isExDateInRange(start: number, end: number, range: ExTimeRange) {
    const diff = end - start
    const rDiff = exTimeRangeToMilliseconds(range)
    return diff <= rDiff
}

export function isExDateOutOfRange(start: number, end: number, range: ExTimeRange) {
    const diff = end - start
    const rDiff = exTimeRangeToMilliseconds(range)
    return diff > rDiff
}

