import { IPoint2D, IPoint3D, IPoint4D } from "./point";

export type IBaseCurve<PointT extends IPoint2D<any>|IPoint3D<any>|IPoint4D<any>> = Array<PointT>
