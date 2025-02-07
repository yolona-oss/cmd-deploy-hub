export interface IPoint {
    x: number
    y: number
}

export interface IPoint2D {
    x: number
    y: number
}

export interface IPoint3D {
    x: number
    y: number
    z: number
}

export interface IPoint4D {
    x: number
    y: number
    z: number
    w: number
}

export class Point2D implements IPoint2D {
    constructor(public x: number = 0, public y: number = 0) {}
}
