import { Transformable } from "nekogirl-valhalla/object/Transformable";
import { Ray } from "./Ray";

import { ReadonlyVec3, ReadonlyMat4, ReadonlyMat3 } from "gl-matrix";
import { IComponent } from "../component/IComponent";
import { BoundingBox } from "./BoundingBox";

export interface Collider extends IComponent {
  // using an inheritable component means we can share a live transform w collider
  // but this means we can screw with it a little if we want

  // manager means we can cache inverse transforms (which we might need)

  // we could handle the ray transformation beforehand ...
  // eh, too presumptuous

  /**
   * Performs a raycast on a collider.
   * @param r - the ray to cast, in world space.
   * @returns a record of the collision or null if no collision occurred.
   */
  raycast(r: Ray) : boolean;
  // return a boolean for now

  /**
   * Finds the closest point on the collider to a given point.
   * If the point is inside the collider, returns a copy of it.
   * @param p - the point in question.
   * @returns the closest point.
   */
  getClosestPoint(p: ReadonlyVec3) : ReadonlyVec3;

  /**
   * @returns a bounding box for this collider
   */
  getBoundingBox() : BoundingBox;

  /**
   * Sets the transform for this collider.
   * @param m - desired transform
   */
  setTransform(m: ReadonlyMat4) : void;

  /**
   * @returns the transform for this collider
   */
  getTransform() : ReadonlyMat4;

  /**
   * @returns the inverse transform for this collider
   */
  getTransformInverse() : ReadonlyMat4;

  /**
   * @returns the normal transform for this collider
   */
  getTransformNormal() : ReadonlyMat3;

  /**
   * @returns the inverse of the normal transform for this collider
   */
  getTransformInverseNormal() : ReadonlyMat3;


  // debug draw would make sense at some point
  // a debug drawer would let us specify lines ig
}