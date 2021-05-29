import { GameContext } from "../../GameContext";
import { Framebuffer } from "../Framebuffer";
import { ColorTexture } from "./ColorTexture";
import { DepthTexture } from "./DepthTexture";

export class ShadowFramebuffer implements Framebuffer {
  // TODO: could we use a renderbuffer here?
  colorTexture: ColorTexture;
  shadowTexture: DepthTexture;
  framebuffer: WebGLFramebuffer;
  gl: WebGLRenderingContext;

  get dims() {
    return this.colorTexture.dims;
  }

  constructor(ctx: GameContext, dims: [number, number]) {
    this.colorTexture = new ColorTexture(ctx, dims);
    this.shadowTexture = new DepthTexture(ctx, dims);
    this.gl = ctx.getGLContext();
    let gl = this.gl;
    this.framebuffer = gl.createFramebuffer();
    this.setFramebufferSize(dims);
    
    this.colorTexture.attachToFramebuffer(this.framebuffer);
    this.shadowTexture.attachToFramebuffer(this.framebuffer);
  }

  getColorTexture() {
    return this.colorTexture;
  }

  getDepthTexture() {
    return this.shadowTexture;
  }

  setFramebufferSize(dim_a: [number, number] | number, dim_b?: number) {
    this.colorTexture.setDimensions(dim_a, dim_b);
    this.shadowTexture.setDimensions(dim_a, dim_b);

    this.colorTexture.attachToFramebuffer(this.framebuffer);
    this.shadowTexture.attachToFramebuffer(this.framebuffer);
  }

  bindFramebuffer(target?: number) {
    let targ = target;
    if (!targ) {
      targ = this.gl.FRAMEBUFFER;
    }

    
    this.gl.bindFramebuffer(targ, this.framebuffer);
  }
}