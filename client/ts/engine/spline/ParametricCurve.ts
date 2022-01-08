import { ReadonlyVec3, vec3 } from "gl-matrix";

// rudimentary interface for parametric curves
export abstract class ParametricCurve {

  abstract readonly segmentCount : number;

  constructor() {
    this.versionnumber_ = 0;
  }
  /**
   * Returns the position on the curve at some time t.
   * @param time - desired time
   */
  abstract getPosition(time: number) : vec3;

  /**
   * Returns the tangent on the curve at some time t.
   * @param time - desired time
   */
  abstract getTangent(time: number) : vec3;

  /**
   * Returns a normal vector for the parametric curve.
   * @param time - desired time
   * @param up - if provided, specifies an up vector which is then used to calculate the normal.
   *             otherwise, the Y+ unit vector is used, or if the curve is oriented along the Y axis, the Z+ unit vector.
   */
  abstract getNormal(time: number, up?: ReadonlyVec3) : vec3;

  /**
   * Returns a control point on this curve.
   * @param point - the index of the desired point.
   * @returns the point, or null if the point is OOB.
   */
  abstract getControlPoint(point: number) : vec3;

  abstract getControlPointCount() : number;

  /**
   * @param index - the segment whose length we are polling.
   * @returns the length of the specified segment.
   * Returns 0 if param is out of bounds.
   */
  abstract getSegmentLength(index: number) : number;

  // do we want to maintain an "update tracker" for our curves?
  // we uptick a value everytime the curve is modified, so that
  // components down-wind can tell that it's been updated when we go to fetch contents

  protected update() { this.versionnumber_++; }

  get versionnumber() {
    return this.versionnumber_;
  }

  

  private versionnumber_: number;

  abstract readonly arcLength: number;
}