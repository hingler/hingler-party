import { RenderContext, RenderPass } from "../render/RenderContext";

export abstract class ModelInstance {
  private deleted_ : boolean;
  constructor() {
    this.deleted_ = false;
  }

  get deleted() {
    return this.deleted;
  }
  
  /**
   * Marks this instance for deletion.
   */
  deleteInstance() {
    this.deleted_ = true;
  } 

  /**
   *  Draws this model instance.
   */
  abstract draw(rc: RenderContext) : void;
}