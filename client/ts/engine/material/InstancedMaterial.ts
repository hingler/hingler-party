import { InstancedModel } from "../model/InstancedModel";
import { RenderContext } from "../render/RenderContext";

/**
 * Represents a material which is designated to draw one or more model instances.
 */
export interface InstancedMaterial {
  /**
   * Binds relevant attributes on instanced model.
   * @param model - the instanced model being drawn.
   * @param instances - a hint at the number of instances which will be drawn.
   */
  prepareAttributes(model: InstancedModel, instances: number, rc: RenderContext) : void;
  
  /**
   * Called after a draw call.
   * Disables any attributes which may still be enabled.
   */
  cleanUpAttributes() : void;
}