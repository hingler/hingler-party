import { GameContext } from "../../GameContext";
import { EngineObject } from "../EngineObject";

import { mat4, vec3, quat, ReadonlyMat4 } from "gl-matrix";
import { RenderContext } from "../../render/RenderContext";
import { perf } from "../../../../../ts/performance";
import { logRender } from "../../internal/performanceanalytics";
import { assert } from "console";

/**
 * Game object rendered to a lovely 3d world.
 */
export class GameObject extends EngineObject {
  private children: Set<GameObject>;
  private parent: GameObject;

  private transform_cache: mat4;
  private position: vec3;
  private scale: vec3;
  private rotation: quat;

  private dirty: boolean;

  constructor(ctx: GameContext) {
    super(ctx);
    this.children = new Set();
    this.parent = null;

    this.transform_cache = mat4.create();
    mat4.identity(this.transform_cache);

    this.position = vec3.create();
    vec3.zero(this.position);

    this.scale = vec3.create();
    vec3.set(this.scale, 1, 1, 1);

    this.rotation = quat.create();
    quat.identity(this.rotation);
    this.dirty = true;
  }

  /**
   * Function which draws this component onto the screen.
   * Should be called once whenever this object is drawn.
   */
  renderMaterial(rc: RenderContext) {
    // currently a noop
  }

  // renders itself and its children
  protected renderfunc(rc: RenderContext) {
    const timer = this.getContext().getGPUTimer();
    this.renderMaterial(rc);
    // overtime should round out :)
    for (let child of this.children) {
      child.renderfunc(rc);
    }
  }

  protected updatefunc() {
    this.update();
    for (let child of this.children) {
      child.updatefunc();
    }
  }

  getChildren() : Array<GameObject> {
    let res = [] as GameObject[];
    for (let child of this.children) {
      res.push(child);
    }

    return res;
  }

  getParent() {
    return this.parent;
  }

  getChild(id: number) {
    for (let child of this.children) {
      if (child.getId() === id) {
        return child;
      }
    }

    let res : GameObject;

    for (let child of this.children) {
      res = child.getChild(id);
      if (res) {
        return res;
      }
    }

    return null;
  }

  /**
   * Removes the object with passed ID from this object's hierarchy.
   * @param id - the ID of the object we wish to find.
   * @returns the object if it could be found and removed -- otherwise, null.
   */
  removeChild(id: number) {
    if (id === this.getId()) {
      return null;
    }

    let res : GameObject = null;
    for (let child of this.children) {
      if (child.getId() === id) {
        res = child;
        break;
      }
    }

    if (res !== null) {
      this.children.delete(res);
      res.parent = null;
      res.invalidateTransformCache_();
      return res;
    }

    // desired child is not a direct descendant.

    res = this.getChild(id);
    if (res) {
      res.parent.removeChild(res.getId());
      res.parent = null;
      res.invalidateTransformCache_();
      return res;
    }
  }

  /**
   * Adds the passed view as a child of this view.
   * @param elem - the new child.
   * @returns true if the view could be successfully added as a child -- false otherwise.
   */
  addChild(elem: GameObject) {
    // if this is anywhere above me in the hierarchy, we'll have a problem
    if (elem.getChild(this.getId())) {
      console.warn("An element's descendant cannot also be its parent!");
      return false;
    } else {
      if (elem.parent) {
        elem.parent.removeChild(elem.getId());
      }

      elem.invalidateTransformCache_();
      elem.parent = this;
      this.children.add(elem);
      return true;
    }
  }

  /**
   * @returns Rotation of this gameobject.
   */
  getRotation() {
    return quat.copy(quat.create(), this.rotation);
  }

  /**
   * @returns Position of this gameobject.
   */
  getPosition() {
    return vec3.copy(vec3.create(), this.position);
  }

  /**
   * @returns Scale of this gameobject.
   */
  getScale() {
    return vec3.copy(vec3.create(), this.scale);
  }

  /**
   * Sets the rotation of this GameObject as euler coordinates, specified in degrees.
   * @param x - x rotation, or vec3 containing XYZ euler rotation.
   * @param y - if valid: y rotation.
   * @param z - if valid: z rotation.
   */
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
    this.invalidateTransformCache_();
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

  /**
   * Sets the scale of this GameObject.
   * @param x - either the x dimension or our scale, or a vec3 containing the new scale for this object.
   * @param y - if valid: y scale.
   * @param z - if valid: z scale.
   */
  setScale(x: number | vec3, y?: number, z?: number) {
    if (!(typeof x === "number") && x.length >= 3) {
      this.setScaleNum_(x[0], x[1], x[2]);
    } else if (typeof x === "number" && typeof y === "number" && typeof z === "number") {
      this.setScaleNum_(x, y, z);
    } else {
      console.warn("Parameters to `setScale` cannot be interpreted.")
    }
  }

  private setScaleNum_(x: number, y: number, z: number) {
    this.scale[0] = x;
    this.scale[1] = y;
    this.scale[2] = z;

    this.invalidateTransformCache_();
  }

  /**
   * Sets the position of this GameObject.
   * @param x - x coordinate, or vector containing new pos.
   * @param y - y coordinate, if valid.
   * @param z - z coordinate, if valid. 
   */
  setPosition(x: number | vec3, y?: number, z?: number) {
  if (typeof x === "number" && typeof y === "number" && typeof z === "number") {
    this.setPositionNum_(x, y, z);
  // this is the best i can do i think
  } else if (!(typeof x === "number") && x.length >= 3) {
      this.setPositionNum_(x[0], x[1], x[2]);
  } else {
      console.warn("Parameters to `setPosition` cannot be interpreted.")
    }
  }

  private setPositionNum_(x: number, y: number, z: number) {
    this.position[0] = x;
    this.position[1] = y;
    this.position[2] = z;
    this.invalidateTransformCache_();
  }

  getGlobalPosition() {
    let posLocal = vec3.zero(vec3.create());
    vec3.transformMat4(posLocal, posLocal, this.getTransformationMatrix());
    return posLocal;
  }

  lookAt(x: number | vec3, y?: number, z?: number) {
    let dirVector : vec3 = (typeof x === "number" ? vec3.fromValues(x, y, z) : vec3.copy(vec3.create(), x));
    let pos = this.getPosition();
    // account for own offset: vector from camera to dest
    vec3.sub(dirVector, dirVector, pos);
    let dir = vec3.create();
    vec3.normalize(dir, dirVector);
    let theta = Math.PI + Math.atan2(dir[0], dir[2]);
    let phi : number;
    let phi_denom = Math.sqrt(dir[0] * dir[0] + dir[2] * dir[2]);
    if (phi_denom === 0 || phi_denom === NaN) {
      phi = 0;
    } else {
      phi = Math.atan(dir[1] / phi_denom);
    }

    this.setRotationEuler(phi * (180 / Math.PI), theta * (180 / Math.PI), 0);
  }

  private invalidateTransformCache_() {
    // note: lots of redundant action if we do a lot of txs
    // assumption: if a child is already dirty, its children will be dirty as well
    if (!this.dirty) {
      this.dirty = true;
      for (let child of this.children) {
        child.invalidateTransformCache_();
      }
    }
  }

  /**
   * @returns the transformation matrix associated with this GameObject.
   */
  getTransformationMatrix() : ReadonlyMat4 {
    if (this.dirty) {
      let res = this.transform_cache;
      mat4.fromRotationTranslationScale(res, this.rotation, this.position, this.scale);
      
      if (this.parent !== null) {
        mat4.mul(res, this.parent.getTransformationMatrix(), res);
      }

      this.transform_cache = res;
      this.dirty = false;
    }

    return this.transform_cache;
  }
}