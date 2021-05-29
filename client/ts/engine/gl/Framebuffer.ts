import { Texture } from "./Texture";

export interface Framebuffer {
  readonly dims: [number, number];
  /**
   * Returns the color texture attached to this framebuffer, if one exists.
   * Otherwise returns null.
   */
  getColorTexture() : Texture;

  /**
   * Gets the depth texture attached to this framebuffer, if one exists.
   * Otherwise returns null.
   */
  getDepthTexture() : Texture;

  /**
   * Resizes the framebuffer as well as its attachments.
   * @param dim_a - the width in px, or an array containing width and height (in order).
   * @param dim_b - if dim_a is a number, contains the height in px.
   */
  setFramebufferSize(dim_a: [number, number] | number, dim_b?: number) : void;

  /**
   * Binds this framebuffer to the specified GL target.
   * @param target - the target we wish to bind to.
   */
  bindFramebuffer(target: number) : void;
}