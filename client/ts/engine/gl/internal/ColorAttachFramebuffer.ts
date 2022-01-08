import { vec2 } from "gl-matrix";
import { GameContext } from "../../GameContext";
import { Framebuffer } from "../Framebuffer";
import { ColorTexture } from "./ColorTexture";
import { DepthTexture } from "./DepthTexture";
import { FloatColorTexture } from "./FloatColorTexture";

/**
 * A framebuffer class which explicitly allows arbitrary textures
 * to attach themselves to a binding point.
 * 
 * (rather than invalidate resources each time we redraw, we can return a unique texture)
 */
export class ColorAttachFramebuffer implements Framebuffer {
  dims: [number, number];

  private colorTexture: FloatColorTexture | ColorTexture;
  private depthTexture: DepthTexture;

  private fb: WebGLFramebuffer;
  private ctx: GameContext;

  constructor(ctx: GameContext) {
    this.colorTexture = null;
    this.depthTexture = new DepthTexture(ctx, [8, 8]);
    this.ctx = ctx;

    let gl = ctx.getGLContext();
    this.fb = gl.createFramebuffer();

    // whatever, we're not going to do anything anyway
    this.dims = [8, 8];
  }

  getColorTexture() {
    return this.colorTexture;
  }

  getDepthTexture() {
    return this.depthTexture;
  }

  setFramebufferSize(dim_a: [number, number] | number, dim_b?: number) {
    if (this.colorTexture !== null) {
      this.colorTexture.setDimensions(dim_a, dim_b);
      this.colorTexture.attachToFramebuffer(this.fb);
    }
    
    this.depthTexture.setDimensions(dim_a, dim_b);
    this.depthTexture.attachToFramebuffer(this.fb);
    this.dims = (typeof dim_a === "number" ? [dim_a, dim_b] : dim_a) as [number, number];
  }

  /**
   * Attachesw a color texture to this framebuffer.
   * @param tex - the color texture we wish to attach.
   */
  setColorTexture(tex: ColorTexture | FloatColorTexture) {
    tex.attachToFramebuffer(this.fb);
    this.colorTexture = tex;

    if (!vec2.equals(this.dims, tex.dims)) {
      this.depthTexture.setDimensions(tex.dims);
      vec2.copy(this.dims, tex.dims);
    }
    
    this.depthTexture.attachToFramebuffer(this.fb);
  }

  /**
   * Removes the currently associated color texture from this FB and returns it.
   * @returns color texture
   */
  unsetColorTexture() {
    const ret = this.colorTexture;
    // const gl = this.ctx.getGLContext();
    this.colorTexture = null;
    return ret;
  }

  bindFramebuffer(target?: number) {
    const gl = this.ctx.getGLContext();
    let targ = target;
    if (!targ) {
      targ = gl.FRAMEBUFFER;
    }

    if (!this.colorTexture) {
      console.warn("Attempted to draw to ColorAttachFramebuffer without a color texture. Ignoring...");
    } else {
      gl.bindFramebuffer(targ, this.fb);
    }

  }
}