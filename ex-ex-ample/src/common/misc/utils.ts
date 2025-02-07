import * as crypto from 'crypto';

export type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>

// TODO maybe URL
export function extractFileName(filePath: string, removeExtension: boolean = true) {
    const urlArr = filePath.split('/')
    const fullName = urlArr[urlArr.length - 1]
    let fileName = fullName
    if (removeExtension) {
        fileName = fullName.split('.')[0]
    }
    return fileName
}

export const generateRandom = () => Math.random().toString(36).substring(2, 15)

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

export function sleep(ms: number) { return new Promise(resolve => setTimeout(resolve, ms)); }

export async function timeout<T>(task: () => Promise<T>, timeout: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error("Operation timed out"));
    }, timeout);

    task()
      .then((result) => {
        clearTimeout(timer);
        resolve(result);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
}

export async function retrier<T>(fn: () => Promise<T>, opts?: { tries?: number, wait?: number, timeout?: number }): Promise<T> {
    const default_opts = { tries: 3, wait: 700, timeout: 0 }
    const _opts = {
        ...default_opts,
        ...opts
    }
    if (_opts.timeout <= 0) {
        console.error("Timeout must be greater than 0. Setting to 0.")
        _opts.timeout = 0
    }

    const checkFn = async () => {
        try {
            return await fn()
        } catch (e) {
            await sleep(_opts.wait)
            return null
        }
    }
    let loopFn: () => Promise<T|null>
    if (_opts.timeout > 0) {
        // timeouted
        loopFn = async () => await new Promise((res) => {
            timeout(checkFn, _opts.timeout).then((v) => {
                if (!v) { res(null) }
                res(v)
            }).catch(() => { res(null) })
        })
    } else {
        loopFn = checkFn
    }
    for (let tryn = 0; tryn < _opts.tries; tryn++) {
        const res = await loopFn()
        if (res) { return res } // exit success
    }

    throw "Unreachable action: " + fn.name
}
