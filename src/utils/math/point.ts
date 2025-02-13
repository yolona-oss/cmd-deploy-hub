export interface IPoint<T extends bigint | number = number> {
    x: T
    y: T
}

export interface IPoint2D<T extends bigint | number = number> {
    x: T
    y: T
}

export interface IPoint3D<T extends bigint | number = number> {
    x: T
    y: T
    z: T
}

export interface IPoint4D<T extends bigint | number = number> {
    x: T
    y: T
    z: T
    w: T
}

type zeroT<T extends bigint | number> = T extends bigint ? 0n : 0

export class Point2D<T extends bigint | number = number> implements IPoint2D<T> {
    constructor(public x: T, public y: T) {
    }
}
