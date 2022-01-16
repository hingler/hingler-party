import { quat, ReadonlyQuat, ReadonlyVec3, vec3 } from "gl-matrix";

/**
 * Transformable objects are subject to matrix transformations. thats it :D
 */
export interface Transformable {

  getRotation() : ReadonlyQuat;
  getPosition() : ReadonlyVec3;
  getScale() : ReadonlyVec3;

  /**
   * Sets the euler rotation of this Transformable, specified in degrees.
   * @param x - x rotation or XYZ vec3.
   * @param y - y rotation (if x is number) 
   * @param z - z rotation (if x is number)
   */
  setRotationEuler(x: number | vec3, y?: number, z?: number) : void;

  /**
   * Sets rotation of this Transformable with a quaternion.
   * @param x - quat or x coord
   * @param y - y coord
   * @param z - z coord
   * @param w - w coord
   */
  setRotationQuat(x: number | quat, y?: number, z?: number, w?: number) : void;

  /**
   * Sets the scale of this Transformable.
   * @param x - either the x dimension or our scale, or a vec3 containing the new scale for this object.
   * @param y - if valid: y scale.
   * @param z - if valid: z scale.
   */
  setScale(x: number | vec3, y?: number, z?: number) : void;

  /**
   * Sets the position of this Transformable.
   * @param x - x coordinate, or vector containing new pos.
   * @param y - y coordinate, if valid.
   * @param z - z coordinate, if valid. 
   */
   setPosition(x: number | vec3, y?: number, z?: number) : void;
}