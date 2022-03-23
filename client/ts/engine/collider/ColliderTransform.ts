/**
 * ColliderTransform stores transformation data for colliders :D
 */

import { mat4, mat3, ReadonlyMat4, ReadonlyMat3 } from "gl-matrix";

export class ColliderTransform {
  private transform : mat4;
  private transformInverse : mat4;
  private transformNormal : mat3;
  private transformInverseNormal : mat3;

  constructor() {
    this.transform = mat4.identity(mat4.create());
    this.transformInverse = mat4.identity(mat4.create());
    this.transformNormal = mat3.identity(mat3.create());
    this.transformInverseNormal = mat3.identity(mat3.create());
  }

  setTransform(transform: ReadonlyMat4) {
    if (!mat4.exactEquals(this.transform, transform)) {
      mat4.copy(this.transform, transform);
  
      // calculate normal mat in transforminverse place
      mat4.invert(this.transformInverse, this.transform);
      mat4.transpose(this.transformInverse, this.transformInverse);
      mat3.fromMat4(this.transformNormal, this.transformInverse);

      // store inversenormal
      mat3.invert(this.transformInverseNormal, this.transformNormal);
  
      // transpose again to get inverse only
      mat4.transpose(this.transformInverse, this.transformInverse);
    }
  }

  getTransform() : ReadonlyMat4 {
    return this.transform;
  }

  getTransformInverse() : ReadonlyMat4 {
    return this.transformInverse;
  }

  getTransformNormal() : ReadonlyMat3 {
    return this.transformNormal;
  }

  getTransformInverseNormal() : ReadonlyMat3 {
    return this.transformInverseNormal;
  }
}