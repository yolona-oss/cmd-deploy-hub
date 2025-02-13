import crypto from "crypto"

export const isNumberPositive = (v: number) => v > 0

export const genRandomString = (length: number = 15) => Math.random().toString(36).substring(2, length)
export const genRandomNumber = (length: number = 15) => Number(genRandomString(length))

export function genRandomNumberBetween<T extends number | bigint>(min: T, max: T): T {
    if (typeof min === "bigint" && typeof max === "bigint") {
        const range = max - min + BigInt(1);
        const randomBigInt = crypto.getRandomValues(new BigUint64Array(1))[0] % range;
        return min + randomBigInt as T;
    } else if (typeof min === "number" && typeof max === "number") {
        return Math.floor(Math.random() * (max - min + 1)) + min as T;
    } else {
        throw new Error("Invalid types for min and max. They must both be either number or bigint.");
    }
}

export function genRandomNumberBetweenWithScatter<T extends number|bigint = number>(
    min: T,
    max: T,
    scatter: T,
    fixed = 2
): T {
    if (typeof min !== typeof max || typeof min !== typeof scatter) {
        throw new Error("min, max, and scatter must be of the same type (Number or BigInt)");
    }

    if (typeof min === 'number') {
        // Handle Number type
        const scatterMin = min - (scatter as number);
        // @ts-ignore
        const scatterMax = max + (scatter as number);

        // Ensure scatterMin and scatterMax are within valid bounds
        const adjustedMin = Math.max(scatterMin, Number.MIN_SAFE_INTEGER);
        const adjustedMax = Math.min(scatterMax, Number.MAX_SAFE_INTEGER);

        // Generate a random number between the adjusted min and max
        return Number((Math.floor(Math.random() * (adjustedMax - adjustedMin + 1)) + adjustedMin).toFixed(fixed)) as T;
    } else if (typeof min === 'bigint') {
        // Handle BigInt type
        const scatterMin = min - (scatter as bigint);
        // @ts-ignore
        const scatterMax = max + (scatter as bigint);

        // Ensure scatterMin and scatterMax are within valid bounds
        const adjustedMin = scatterMin < 0n ? 0n : scatterMin; // Example lower bound for BigInt
        const adjustedMax = scatterMax > BigInt(Number.MAX_SAFE_INTEGER) ? BigInt(Number.MAX_SAFE_INTEGER) : scatterMax;

        // Generate a random BigInt between the adjusted min and max
        const range = adjustedMax - adjustedMin + 1n;
        const randomBits = BigInt(Math.floor(Math.random() * Number.MAX_SAFE_INTEGER));
        return adjustedMin + (randomBits % range) as T;
    } else {
        throw new Error("Unsupported type for min, max, or scatter");
    }
}

export function randomizeWithScatter<T extends number|bigint = number>(value: T, scatter: T, fixed = 2) {
    return genRandomNumberBetweenWithScatter<T>(value, value, scatter, fixed)
}

export function randomizeWithPercentScatter<T extends number|bigint = number>(value: T, percent: number, fixed = 2) {
    let scatter: number|bigint = 0
    if (typeof value === "bigint") {
        scatter = value * (BigInt(percent) / BigInt(100))
    } else if (typeof value === "number") {
        scatter = value * (percent / 100)
    }
    return genRandomNumberBetweenWithScatter<T>(value, value, scatter, fixed)
}

//export class SimpleGenerator {
//    constructor() { }
//
//    private * generate(): Generator<number> {
//        while (true) {
//            yield Math.floor(Math.random() * Number.MAX_VALUE)
//        }
//    }
//
//    [Symbol.iterator](): Generator<number> {
//        return this.generate()
//    }
//}
//
//export class IdGenerator {
//    static sequential(initial = 0) {
//        let id = initial
//
//        return () => {
//            if (id >= Number.MAX_VALUE) {
//                throw new Error("IdGenerator::sequential: Maximum value reached")
//            }
//            return ++id
//        }
//    }
//}

//interface ResetStrategy {
//    exec: () => { availableNumbers: number[], range: number[] }
//    update: (range: Range) => void
//}

//enum ResetStrategyErrorType {
//    maxNumberReached,
//    notUpdatedRange,
//}
//
//export interface IResetStrategyErrorMessage {
//    type: ResetStrategyErrorType;
//    message: string;
//}
//
//export const ErrorsDefenition: Record<ResetStrategyErrorType, IResetStrategyErrorMessage> = {
//    [ResetStrategyErrorType.maxNumberReached]: {
//        type: ResetStrategyErrorType.maxNumberReached,
//        message: "Maximum number reached"
//    },
//    [ResetStrategyErrorType.notUpdatedRange]: {
//        type: ResetStrategyErrorType.notUpdatedRange,
//        message: "Range not updated"
//    }
//}
//
//class ResetStrategyError extends Error {
//    public readonly eCode: ResetStrategyErrorType
//    public readonly message: string
//
//    constructor(eCode: ResetStrategyErrorType, message?: string) {
//        super(message)
//        this.name = "ResetStrategyError"
//        const error = ErrorsDefenition[eCode]
//        if (!error) throw new Error('Unable to find message code error.');
//        this.eCode = eCode
//        this.message = message ? message : error.message
//    }
//}

//class ManualResetStrategy implements ResetStrategy {
//    private isUpdated = true
//
//    constructor(private range: Range) { }
//
//    update(range: Range) {
//        this.isUpdated = true
//        this.range = range
//    }
//
//    exec() {
//        if (!this.isUpdated) {
//            throw new ResetStrategyError(ResetStrategyErrorType.notUpdatedRange)
//        }
//        this.isUpdated = false
//        const { offset, limit } = this.range
//        const range = Array.from({ length: limit - offset + 1 }, (_, i) => i + offset);
//        return {
//            range,
//            availableNumbers: [...range]
//        }
//    }
//}
//
//class AutoResetStrategy implements ResetStrategy {
//    private isFirstcall = true
//
//    constructor(private range: Range) {
//        const limit = genRandomNumberBetween(50, 500)
//        this.range = {
//            limit,
//            offset: genRandomNumberBetween(6, limit/2)
//        }
//    }
//
//    update(range: Range) { range; }
//
//    private regenRange() {
//        const incrementOffset = genRandomNumberBetween(50, 500)
//        const incrementLimit = genRandomNumberBetween(250, 500)
//
//        let newOffset
//        let newLimit
//        if (this.isFirstcall) {
//            newOffset = this.range.offset
//            newLimit = this.range.limit
//            this.isFirstcall = false
//        } else {
//            newOffset = this.range.offset + incrementOffset
//            newLimit = this.range.limit + incrementLimit
//        }
//
//        if (newLimit >= Number.MAX_VALUE-501) {
//            throw new ResetStrategyError(ResetStrategyErrorType.maxNumberReached)
//        }
//
//        this.range = {
//            limit: newLimit,
//            offset: newOffset
//        }
//    }
//
//    exec() {
//        this.regenRange()
//        const { offset, limit } = this.range
//        const range = Array.from({ length: limit - offset + 1 }, (_, i) => i + offset);
//        return {
//            range,
//            availableNumbers: [...range]
//        }
//    }
//}
//
//export class NoRepeatRandomGenerator {
//    private availableNumbers: number[];
//    private generatedNumbers: number[] = [];
//    private resetStrategy: ResetStrategy
//
//    constructor(range: Range, autoReset = false) {
//        const { offset, limit } = range
//        if (offset > limit) {
//            throw new Error("Minimum value cannot be greater than maximum value.");
//        }
//
//        autoReset ? this.resetStrategy = new AutoResetStrategy(range) :
//            this.resetStrategy = new ManualResetStrategy(range)
//
//        const { availableNumbers } = this.resetStrategy.exec();
//        this.availableNumbers = availableNumbers
//    }
//
//    public generate(): number | null {
//        if (this.availableNumbers.length === 0) {
//            try {
//                this.resetStrategy.exec()
//            } catch(e) {
//                if (e instanceof ResetStrategyError) {
//                    if (e.eCode === ResetStrategyErrorType.maxNumberReached) {
//                        throw new Error(e.message)
//                    } else if (e.eCode === ResetStrategyErrorType.notUpdatedRange) {
//                        log.warn("NoRepeatRandomGenerator::generate: ", e.message)
//                        return null
//                    }
//                }
//            }
//        }
//
//        const randomIndex = Math.floor(Math.random() * this.availableNumbers.length);
//        const number = this.availableNumbers.splice(randomIndex, 1)[0];
//        this.generatedNumbers.push(number);
//        return number;
//    }
//
//    /***
//    * @description !!Not affected if class is initialized with autoReset = true.
//    * Updates the range for generateion. 
//    */
//    update(range: Range): void {
//        this.resetStrategy.update(range)
//    }
//
//    *[Symbol.iterator]() {
//        while (this.availableNumbers.length > 0) {
//            yield this.generate();
//        }
//    }
//
//    public getGeneratedNumbers(): number[] {
//        return this.generatedNumbers;
//    }
//
//    public getAvailableNumbers(): number[] {
//        return this.availableNumbers;
//    }
//
//    public hasNext(): boolean {
//        return this.availableNumbers.length > 0;
//    }
//}
