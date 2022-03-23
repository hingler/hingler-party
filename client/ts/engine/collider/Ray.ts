import { vec3, ReadonlyVec3 } from "gl-matrix";
import { Collider } from "./Collider";

/**
 * Ray interface.
 * Make a class? that way we can ensure the direction is always normalized
 */
export class Ray {
  // origin of the ray
  readonly origin: vec3;

  // direction which the ray travels in
  readonly direction: vec3;

  constructor(origin: ReadonlyVec3, direction: ReadonlyVec3) {
    this.origin = vec3.copy(vec3.create(), origin);
    this.direction = vec3.copy(vec3.create(), direction);

    vec3.normalize(this.direction, this.direction);
  }

  /**
   * @param collider - collider in question
   * @returns a new ray which is transformed to the collider's local space. 
   */
  transformToColliderSpace(collider: Collider) : Ray {

    // optimize later -- this is OK for now :)
    const inverseTransform = collider.getTransformInverse();

    // world direction -> object direction
    const inverseNormalTransform = collider.getTransformInverseNormal();

    const originNew = vec3.transformMat4(vec3.create(), this.origin, inverseTransform);
    const directionNew = vec3.transformMat3(vec3.create(), this.direction, inverseNormalTransform);

    const res : Ray = new Ray(originNew, directionNew)

    return res;

  }
}