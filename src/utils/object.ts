export function extractValueFromObject(obj: object, path: string): any {
    let ret: any = obj

    for (const node of path.split('.')) {
        ret = ret[node]
    }

    return ret
}

export function assignToCustomPath(obj: any, propPath: string, value: any): object {
    let paths = propPath.split(".")

    if (paths.length > 1) {
        var key = <any>(paths.shift())
        assignToCustomPath(
            obj[key] =
                Object.prototype.toString.call(obj[key]) === "[object Object]"
                    ? obj[key]
                    : {},
            paths.join('.'),
            value)
    } else {
        if (obj[paths[0]] === undefined) {
            obj[paths[0]] = value
        } else {
            Object.assign(obj[paths[0]], value)
        }
    }

    return obj
}

