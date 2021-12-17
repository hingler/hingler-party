import { vec3 } from "gl-matrix";

// rudimentary interface for parametric curves
export interface ParametricCurve {
  /**
   * Returns the position on the curve at some time t.
   * @param time - desired time
   */
  getPosition(time: number) : vec3;

  /**
   * Returns the tangent on the curve at some time t.
   * @param time - desired time
   */
  getTangent(time: number) : vec3;

  /**
   * Returns a normal vector for the parametric curve.
   * @param time - desired time
   * @param up - if provided, specifies an up vector which is then used to calculate the normal.
   *             otherwise, the Y+ unit vector is used, or if the curve is facing upwards, the Z+ unit vector.
   */
  getNormal(time: number, up?: vec3) : vec3;

  /**
   * Returns a control point on this curve.
   * @param point - the index of the desired point.
   * @returns the point, or null if the point is OOB.
   */
  getControlPoint(point: number) : vec3;

  /**
   * Modifies a control point's value.
   * @param point - the control point being modified.
   * @param val - the new value to assign to this point.
   *              If OOB, the point is ignored.
   */
  setControlPoint(point: number, val: vec3) : void;

  getControlPointCount() : number;
}