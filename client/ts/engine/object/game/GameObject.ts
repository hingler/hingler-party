import { GameContext } from "../../GameContext";

import { mat4, vec3, quat, ReadonlyMat4, ReadonlyVec3, ReadonlyQuat } from "gl-matrix";
import { RenderContext } from "../../render/RenderContext";
import { Transformable } from "nekogirl-valhalla/object/Transformable";
import { Nestable } from "nekogirl-valhalla/object/Nestable";
import { NestableComponent } from "nekogirl-valhalla/object/NestableComponent";
import { TransformableNestableComponent } from "nekogirl-valhalla/object/TransformableNestableComponent";
import { TransformableBase, TransformableComponent } from "nekogirl-valhalla/object/TransformableBase";
import { IDGenerator } from "nekogirl-valhalla/object/IDGenerator";
import { NestableBase } from "nekogirl-valhalla/object/NestableBase";
import { perf } from "@hingler-party/ts/performance";
import { logUpdate } from "../../internal/performanceanalytics";
import { IComponentProvider } from "../../component/IComponentProvider";
import { ComponentType } from "../../component/ComponentType";
import { IComponent } from "../../component/IComponent";
import { ModelComponent } from "../../component/impl/ModelComponent";
import { ComponentManager } from "../../component/internal/ComponentManager";
import { AlphaTextureComponent } from "../../component/impl/AlphaTextureComponent";
import { TransformableNestable } from "nekogirl-valhalla/object/TransformableNestable";
import { InstancedModelComponent } from "../../component/impl/InstancedModelComponent";

const gen = new IDGenerator();

/**
 * Game object rendered to a lovely 3d world.
 */
export class GameObject implements TransformableNestable<GameObject> {
  private nest : NestableComponent<GameObject>;
  private transform : TransformableComponent;
  private nesttransform : TransformableNestableComponent<GameObject>;

  private componentList: Map<ComponentType, IComponent>;

  private name: string;
  private context_: GameContext;
  private created: boolean;

  private dirty: boolean;

  // unfortunately we can't really track destruction of objects
  // our engine will destroy, so we could maintain destruction through that
  // remove destroy from gameobject, and attach it to scene
  // then, we can clear resources by calling methods
  constructor(ctx: GameContext) {
    const id = gen.getNewID();

    this.name = this.constructor.name;
    this.created = false;
    this.context_ = ctx;
    this.name = this.constructor.name;
    this.componentList = new Map();
    
    this.dirty = true;
    
    this.nest = new NestableComponent(id, this);
    this.transform = new TransformableBase();
    this.nesttransform = new TransformableNestableComponent(this as GameObject);
  }

  protected getDebugName() {
    return this.name;
  }

  protected setDebugName(name: string) {
    this.name = name;
  }

  getParent() {
    return this.nest.getParent();
  }

  getChild(id: number) {
    return this.nest.getChild(id);
  }

  getChildren() {
    return this.nest.getChildren();
    
  }

  getId() {
    return this.nest.getId();
  }

  setId(id: number) {
    return this.nest.setId(id);
  }

  getContext() {
    return this.context_;
  }

  removeChild(id: number) {
    const child = this.nest.removeChild(id);
    child.invalidateTransformCache_();
    return child;
  }

  addChild(elem: GameObject) {
    const res = this.nest.addChild(elem.nest);
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
    for (let child of this.nest.getChildren()) {
      child.renderfunc(rc);
    }
  }

  protected childcallback(cb: (child: GameObject) => void) {
    // this is hopefully fine?
    cb(this);
    for (let child of this.nest.getChildren()) {
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
    
    for (let child of this.nest.getChildren()) {
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
  setRotationEuler(x: number | ReadonlyVec3, y?: number, z?: number) {
    this.transform.setRotationEuler(x, y, z);
    this.invalidateTransformCache_();
  }

  setRotationQuat(x: number | ReadonlyQuat, y?: number, z?: number, w?: number) {
    this.transform.setRotationQuat(x, y, z, w);
    this.invalidateTransformCache_();
  }

  /**
   * Sets the scale of this GameObject.
   * @param x - either the x dimension or our scale, or a vec3 containing the new scale for this object.
   * @param y - if valid: y scale.
   * @param z - if valid: z scale.
   */
  setScale(x: number | ReadonlyVec3, y?: number, z?: number) {
    this.transform.setScale(x, y, z);
    this.invalidateTransformCache_();
  }

  /**
   * Sets the position of this GameObject.
   * @param x - x coordinate, or vector containing new pos.
   * @param y - y coordinate, if valid.
   * @param z - z coordinate, if valid. 
   */
  setPosition(x: number | ReadonlyVec3, y?: number, z?: number) {
    this.transform.setPosition(x, y, z);
    this.invalidateTransformCache_();
  }

  getGlobalPosition() {
    return this.nesttransform.getGlobalPosition();
  }

  lookAt(x: number | vec3, y?: number, z?: number) {
    this.nesttransform.lookAt(x, y, z);
    this.invalidateTransformCache_();
  }

  private invalidateTransformCache_() {
    // note: lots of redundant action if we do a lot of txs
    // assumption: if a child is already dirty, its children will be dirty as well
    this.nesttransform.invalidateTransformCache();

    if (!this.dirty) {
      this.dirty = true;
      for (let child of this.nest.getChildren()) {
        child.invalidateTransformCache_();
      }
    }
  }

  /**
   * @returns the transformation matrix associated with this GameObject.
   */
  getTransformationMatrix() : ReadonlyMat4 {
    this.dirty = false;
    return this.nesttransform.getTransformationMatrix();
  }

  getComponent(type: ComponentType.MODEL)         : ModelComponent | null;
  getComponent(type: ComponentType.ALPHATEXTURE)  : AlphaTextureComponent | null;
  getComponent(type: ComponentType.INSTANCEDMODEL): InstancedModelComponent | null;
  getComponent<T extends IComponent>(type: ComponentType) {
    if (this.componentList.has(type)) {
      return this.componentList.get(type) as T;
    }
    
    return null;
  }
  
  addComponent(type: ComponentType.MODEL)        : ModelComponent | null;
  addComponent(type: ComponentType.ALPHATEXTURE) : AlphaTextureComponent | null;
  addComponent(type: ComponentType.INSTANCEDMODEL): InstancedModelComponent | null;
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