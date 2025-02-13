export type FlattenedPaths<T> = T extends object
  ? {
      [K in keyof T]: K extends string
        ? T[K] extends object
          ? `${K}.${FlattenedPaths<T[K]>}`
          : `${K}`
        : never;
    }[keyof T]
  : never;

export function isEmpty(obj: object) {
    return Object.keys(obj).length === 0;
}

export function getInterfacePaths<T>(obj: T): string[] {
    const paths: string[] = [];

    function traverse(currentObj: any, currentPath: string = "") {
        for (const key in currentObj) {
            if (typeof currentObj[key] === "object" && currentObj[key] !== null) {
                traverse(currentObj[key], `${currentPath}${key}.`);
            } else {
                paths.push(`${currentPath}${key}`);
            }
        }
    }

    traverse(obj);
    return paths;
}

export type FlattenedPathsWithTypes<T> = T extends object
  ? {
      [K in keyof T]: K extends string
        ? T[K] extends object
          ? { path: `${K}.${FlattenedPathsWithTypes<T[K]>["path"]}`; type: FlattenedPathsWithTypes<T[K]>["type"] }
          : { path: `${K}`; type: T[K] }
        : never;
    }[keyof T]
  : never;

export function getInterfacePathsWithTypes<T>(obj: T): Array<{ path: string; type: any }> {
    const result: Array<{ path: string; type: any }> = [];

    function traverse(currentObj: any, currentPath: string = "") {
        for (const key in currentObj) {
            const fullPath = currentPath ? `${currentPath}.${key}` : key;
            if (typeof currentObj[key] === "object" && currentObj[key] !== null) {
                traverse(currentObj[key], fullPath);
            } else {
                result.push({ path: fullPath, type: (typeof currentObj[key]).toLowerCase() });
            }
        }
    }

    traverse(obj);
    return result;
}

export async function extractValueFromObject(data: any, field: string): Promise<any | null> {
    if (field === '') {
        return data
    }

    if (typeof data === 'object') {
        if (field in data) {
            return data[field];
        } else {
            for (const value of Object.values(data)) {
                const result = await extractValueFromObject(value, field);
                if (result !== null) {
                    return result;
                }
            }
        }
    } else if (Array.isArray(data)) {
        for (const item of data) {
            const result = await extractValueFromObject(item, field);
            if (result !== null) {
                return result;
            }
        }
    }
    return null;
}

export function assignToCustomPath(obj: any, propPath: string, value: any): any {
    let paths = propPath.split(".")

    if (propPath === '') {
        obj = value
        return obj
    }

    if (paths.length > 1) {
        let key = <any>(paths.shift())
        assignToCustomPath(
            obj[key] =
                Object.prototype.toString.call(obj[key]) === "[object Object]"
                    ? obj[key]
                    : {},
            paths.join('.'),
            value)
    } else {
        if (obj[paths[0]] === undefined || obj[paths[0]] === null) {
            obj[paths[0]] = value
        } else {
            Object.assign(obj[paths[0]], value)
        }
    }

    return obj
}
