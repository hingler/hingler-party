import { quat, ReadonlyQuat, ReadonlyVec3, vec3, vec4 } from "gl-matrix";
import { Transformable } from "./Transformable";

export class TransformableBase implements Transformable {
  private rotation: quat;
  private position: vec3;
  private scale: vec3;

  constructor() {
    this.rotation = quat.identity(quat.create());
    this.position = vec3.zero(vec3.create());
    this.scale = vec3.set(vec3.create(), 1, 1, 1);
  }

  getRotation(): ReadonlyQuat {
    return this.rotation;
  }
  getPosition(): ReadonlyVec3 {
    return this.position;
  }
  getScale(): ReadonlyVec3 {
    return this.scale;
  }

  setRotationEuler(x: number | vec3, y?: number, z?: number) {
    if (!(typeof x === "number") && x.length >= 3) {
      this.setRotationEulerNum_(x[0], x[1], x[2]);
    } else if (typeof x === "number" && typeof y === "number" && typeof z === "number") {
      this.setRotationEulerNum_(x, y, z);
    } else {
      console.warn("Parameters to `setRotationEuler` cannot be interpreted.");
    }
  }

  private setRotationEulerNum_(x: number, y: number, z: number) {
    quat.fromEuler(this.rotation, x, y, z);
  }

  setRotationQuat(x: number | quat, y?: number, z?: number, w?: number) {
    if (!(typeof x === "number") && x.length >= 4) {
      this.setQuatNum_(x[0], x[1], x[2], x[3]);
    } else if (typeof x === "number" && typeof y === "number" && typeof z === "number" && typeof w === "number") {
      this.setQuatNum_(x, y, z, w);
    } else {
      console.warn("Parameters to `setRotationQuat` cannot be interpreted.");
    }
  }

  private setQuatNum_(x: number, y: number, z: number, w: number) {
    this.rotation = quat.fromValues(x, y, z, w);
  }

  setScale(x: number | vec3, y?: number, z?: number) {
    if (!(typeof x === "number") && x.length >= 3) {
      this.setScaleNum_(x[0], x[1], x[2]);
    } else if (typeof x === "number" && typeof y === "number" && typeof z === "number") {
      this.setScaleNum_(x, y, z);
    } else {
      console.warn("Parameters to `setScale` cannot be interpreted.")
      console.warn(x);
    }
  }

  private setScaleNum_(x: number, y: number, z: number) {
    this.scale[0] = x;
    this.scale[1] = y;
    this.scale[2] = z;
  }

  setPosition(x: number | vec3, y?: number, z?: number) {
    if (typeof x === "number" && typeof y === "number" && typeof z === "number") {
      this.setPositionNum_(x, y, z);
    // this is the best i can do i think
    } else if (!(typeof x === "number") && x.length >= 3) {
        this.setPositionNum_(x[0], x[1], x[2]);
    } else {
        console.warn("Parameters to `setPosition` cannot be interpreted.")
        console.error(x);
      }
    }
  
    private setPositionNum_(x: number, y: number, z: number) {
      this.position[0] = x;
      this.position[1] = y;
      this.position[2] = z;
    }
  
}