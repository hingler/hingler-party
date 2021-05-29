/**
 * Objects are the simplest unit in-engine.
 * A single object contains a unique ID (on construction), as well as some simple functions
 * which are called throughout the object's lifecycle.
 */

import { IDGenerator } from "../../../../ts/util/IDGenerator";
import { GameContext } from "../GameContext";
import { ObjectType } from "./ObjectType";

const gen = new IDGenerator();

export abstract class EngineObject {
  private id: number;
  private created: boolean;
  private context: GameContext;
  // i dont need this anymore :)
  readonly type: ObjectType;

  constructor(ctx: GameContext) {
    this.context = ctx;
    this.id = gen.getNewID();
    this.created = false;
    this.type = ObjectType.ENGINEOBJECT;
  }

  setId(id: number) {
    this.id = id;
    gen.registerNewID(id);
  }

  getId() {
    return this.id;
  }

  getContext() {
    return this.context;
  }

  private updateFunc() {
    if (!this.created) {
      this.create();
      this.created = true;
    }

    this.update();

    for (let child of this.getChildren()) {
      child.updateFunc();
    }
  }

  /**
   * Returns a list of all children of this Object.
   */
  abstract getChildren() : Array<EngineObject>;

  /**
   * Returns the child of this Object with the specified ID, or null if the child does not exist.
   */
  abstract getChild(id: number) : EngineObject;

  /**
   * Create routine implemented by clients.
   * Most calls pertaining to other components should probably go here, rather than the ctor.
   * Called only once, before this object is updated for the first time.
   */
  protected create() {
    // nop
  }

  /**
   * Update routine implemented by clients.
   * Called once per frame.
   */
  protected update() {
    // nop
  }

  /**
   * Destroy routine implemented by clients.
   * There is no notion of a destructor here -- however, when the associated "scene" is destroyed,
   * this method will be called exactly once.
   */
  protected destroy() {

  }
}