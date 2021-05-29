import { Framebuffer } from "../../../gl/Framebuffer";
import { Texture } from "../../../gl/Texture";
import { Light } from "./Light";

export interface ShadowCastingLight extends Light {
  
  // near/far clipping planes for shadow rendering
  readonly near: number;
  readonly far: number;
  /**
   * sets the dimensions of this light's shadow textures.
   * @param dim_a - x_dim, or x and y dim array.
   * @param dim_b - y_dim, if not already provided.
   */
  setShadowDims(dim_a: [number, number] | number, dim_b?: number) : void;

  /**
   * @returns shadow dimensions.
   */
  getShadowDims() : [number, number];

  /**
   * @returns the shadow texture.
   */
  getShadowTexture() : Texture;

  /**
   * Enables or disables shadows.
   * @param toggle - turns shadows on or off.
   */
  setShadows(toggle: boolean) : void;

  /**
   * True if shadows on, false if shadows off.
   */
  getShadowState() : boolean;

  /**
   * Returns the framebuffer used to render shadows.
   */
  _getShadowFramebuffer() : Framebuffer;
}