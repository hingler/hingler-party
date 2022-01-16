import { mat4, quat, ReadonlyMat4, ReadonlyQuat, ReadonlyVec3, vec3 } from "gl-matrix";
import { Nestable } from "../Nestable";
import { NestableBase } from "../NestableBase";
import { Transformable } from "../Transformable";
import { TransformableBase } from "../TransformableBase";

// todo: move hierarchal structure into another component?
// eh, its too diff
export class ArmatureNode extends NestableBase<ArmatureNode> implements Transformable, Nestable<ArmatureNode> {
  private transform: TransformableBase;
  private inverseBindMatrix : ReadonlyMat4;

  private transform_cache: mat4;
  private transform_cache_joint: mat4;
  private dirty: boolean;

  constructor(jointID: number, invbind: ReadonlyMat4) {
    super(jointID);
    this.transform = new TransformableBase();
    this.inverseBindMatrix = invbind;
    this.dirty = true;
    this.transform_cache = mat4.create();
    mat4.identity(this.transform_cache);

    this.transform_cache_joint = mat4.create();
    mat4.identity(this.transform_cache_joint);
  }

  getRotation(): ReadonlyQuat {
    return this.transform.getRotation();
  }

  getPosition(): ReadonlyVec3 {
    return this.transform.getPosition();
  }

  getScale(): ReadonlyVec3 {
    return this.transform.getScale();
  }

  setRotationEuler(x: number | vec3, y?: number, z?: number): void {
    this.transform.setRotationEuler(x, y, z);
    this.invalidateTransformCache_();
  }

  setRotationQuat(x: number | quat, y?: number, z?: number, w?: number): void {
    this.transform.setRotationQuat(x, y, z, w);
    this.invalidateTransformCache_();
  }

  setScale(x: number | vec3, y?: number, z?: number): void {
    this.transform.setScale(x, y, z);
    this.invalidateTransformCache_();
  }

  setPosition(x: number | vec3, y?: number, z?: number): void {
    this.transform.setPosition(x, y, z);
    this.invalidateTransformCache_();
  }

  // possible redundancy cut:
  // - move functionality to a different class which combines transformable and nestable
  // - extend that here
  private invalidateTransformCache_() {
    if (!this.dirty) {
      this.dirty = true;
      for (let child of this.getChildren()) {
        child.invalidateTransformCache_();
      }
    }
  }

  private updateMatrixCache() {
    let res = this.transform_cache;
    let joint = this.transform_cache_joint;
    mat4.fromRotationTranslationScale(res, this.getRotation(), this.getPosition(), this.getScale());
    
    if (this.getParent() !== null) {
      mat4.mul(res, this.getParent().getTransformationMatrix(), res);
    }

    mat4.mul(joint, res, this.inverseBindMatrix);
    this.dirty = false;
  }

  getTransformationMatrix() : ReadonlyMat4 {
    if (this.dirty) {
      this.updateMatrixCache();
    }

    return this.transform_cache;
  }

  getJointMatrix() : ReadonlyMat4 {
    if (this.dirty) {
      this.updateMatrixCache();
    }

    return this.transform_cache_joint;
  }
}