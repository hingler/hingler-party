import { GameContext } from "../../GameContext";

import { mat4, vec3, quat, ReadonlyMat4 } from "gl-matrix";
import { RenderContext } from "../../render/RenderContext";
import { Transformable } from "nekogirl-valhalla/object/Transformable";
import { Nestable } from "nekogirl-valhalla/object/Nestable";
import { TransformableBase } from "nekogirl-valhalla/object/TransformableBase";
import { IDGenerator } from "@hingler-party/ts/util/IDGenerator";
import { NestableBase } from "nekogirl-valhalla/object/NestableBase";
import { perf } from "@hingler-party/ts/performance";
import { logUpdate } from "../../internal/performanceanalytics";
import { IComponentProvider } from "../../component/IComponentProvider";
import { ComponentType } from "../../component/ComponentType";
import { IComponent } from "../../component/IComponent";
import { ModelComponent } from "../../component/impl/ModelComponent";
import { ComponentManager } from "../../component/internal/ComponentManager";
import { AlphaTextureComponent } from "../../component/impl/AlphaTextureComponent";

const gen = new IDGenerator();

/**
 * Game object rendered to a lovely 3d world.
 */
export class GameObject extends NestableBase<GameObject> implements Transformable, Nestable<GameObject>, IComponentProvider {
  private id_: number;
  private created: boolean;
  private context_: GameContext;
  private name: string;
  private transform: TransformableBase;

  private transform_cache: mat4;

  private dirty: boolean;

  private componentList: Map<ComponentType, IComponent>;

  // unfortunately we can't really track destruction of objects
  // our engine will destroy, so we could maintain destruction through that
  // remove destroy from gameobject, and attach it to scene
  // then, we can clear resources by calling methods
  constructor(ctx: GameContext) {
    const id = gen.getNewID();
    super(id);
    this.name = this.constructor.name;
    this.created = false;
    this.id_ = gen.getNewID();
    this.context_ = ctx;
    this.name = this.constructor.name;

    this.transform = new TransformableBase();

    this.transform_cache = mat4.create();
    mat4.identity(this.transform_cache);

    this.dirty = true;
    this.componentList = new Map();
  }

  protected getDebugName() {
    return this.name;
  }

  protected setDebugName(name: string) {
    this.name = name;
  }

  getContext() {
    return this.context_;
  }

  removeChild(id: number) {
    const child = super.removeChild(id);
    child.invalidateTransformCache_();
    return child;
  }

  addChild(elem: GameObject) {
    const res = super.addChild(elem);
    elem.invalidateTransformCache_();
    return res;
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
    this.renderMaterial(rc);
    // overtime should round out :)
    for (let child of this.getChildren()) {
      child.renderfunc(rc);
    }
  }

  protected childcallback(cb: (child: GameObject) => void) {
    // this is hopefully fine?
    cb(this);
    for (let child of this.getChildren()) {
      child.childcallback(cb);
    }
  }

  // nop
  protected create() {}
  protected update() {}

  protected updatefunc() {
    if (!this.created) {
      this.create();
      this.created = true;
    }

    const start = perf.now();
    this.update();
    const end = perf.now();
    logUpdate(this.name, end - start);
    
    for (let child of this.getChildren()) {
      child.updatefunc();
    }
  }

  /**
   * @returns Rotation of this gameobject.
   */
  getRotation() {
    return this.transform.getRotation();
  }

  /**
   * @returns Position of this gameobject.
   */
  getPosition() {
    return this.transform.getPosition();
  }

  /**
   * @returns Scale of this gameobject.
   */
  getScale() {
    return this.transform.getScale();
  }

  /**
   * Sets the rotation of this GameObject as euler coordinates, specified in degrees.
   * @param x - x rotation, or vec3 containing XYZ euler rotation.
   * @param y - if valid: y rotation.
   * @param z - if valid: z rotation.
   */
  setRotationEuler(x: number | vec3, y?: number, z?: number) {
    this.transform.setRotationEuler(x, y, z);
    this.invalidateTransformCache_();
  }

  setRotationQuat(x: number | quat, y?: number, z?: number, w?: number) {
    this.transform.setRotationQuat(x, y, z, w);
    this.invalidateTransformCache_();
  }

  /**
   * Sets the scale of this GameObject.
   * @param x - either the x dimension or our scale, or a vec3 containing the new scale for this object.
   * @param y - if valid: y scale.
   * @param z - if valid: z scale.
   */
  setScale(x: number | vec3, y?: number, z?: number) {
    this.transform.setScale(x, y, z);
    this.invalidateTransformCache_();
  }

  /**
   * Sets the position of this GameObject.
   * @param x - x coordinate, or vector containing new pos.
   * @param y - y coordinate, if valid.
   * @param z - z coordinate, if valid. 
   */
  setPosition(x: number | vec3, y?: number, z?: number) {
    this.transform.setPosition(x, y, z);
    this.invalidateTransformCache_();
  }

  getGlobalPosition() {
    let posLocal = vec3.zero(vec3.create());
    vec3.transformMat4(posLocal, posLocal, this.getTransformationMatrix());
    return posLocal;
  }

  lookAt(x: number | vec3, y?: number, z?: number) {
    let dirVector : vec3 = (typeof x === "number" ? vec3.fromValues(x, y, z) : vec3.copy(vec3.create(), x));
    let pos = this.getGlobalPosition();
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
      for (let child of this.getChildren()) {
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
      mat4.fromRotationTranslationScale(res, this.getRotation(), this.getPosition(), this.getScale());
      
      if (this.getParent() !== null) {
        mat4.mul(res, this.getParent().getTransformationMatrix(), res);
      }

      this.transform_cache = res;
      this.dirty = false;
    }

    return this.transform_cache;
  }

  getComponent(type: ComponentType.MODEL)         : ModelComponent | null;
  getComponent(type: ComponentType.ALPHATEXTURE)  : AlphaTextureComponent | null;
  getComponent<T extends IComponent>(type: ComponentType) {
    if (this.componentList.has(type)) {
      return this.componentList.get(type) as T;
    }
    
    return null;
  }
  
  addComponent(type: ComponentType.MODEL)        : ModelComponent | null;
  addComponent(type: ComponentType.ALPHATEXTURE) : AlphaTextureComponent | null;
  addComponent<T extends IComponent>(type: ComponentType) {
    if (this.componentList.has(type)) {
      return this.componentList.get(type) as T;
    }

    const component = ComponentManager.getComponent(type) as T;
    if (component) {
      this.componentList.set(type, component);
    }

    return component;
  }
}