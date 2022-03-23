import { ReadonlyMat4, ReadonlyVec3 } from "gl-matrix";

export interface BoundingBox {
  readonly min: ReadonlyVec3;
  readonly max: ReadonlyVec3;

  /**
   * Contain check on a point.
   * @param p - the point in question.
   * @returns true if the point falls inside the box, false otherwise.
   */
  contains(p: ReadonlyVec3) : boolean;

  /**
   * Transforms this bounding box by a matrix, returning a new BoundingBox which encloses the old one.
   * @param m - the matrix to transform our bounding box by.
   */
  transform(m: ReadonlyMat4) : BoundingBox;
}