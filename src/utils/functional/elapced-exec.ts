export async function elapsedExec(fn: any): Promise<{ elapsed: number, result: any}> {
    const start = Date.now();
    const res = await fn();
    return {
        elapsed: Date.now() - start,
        result: res
    }
}
