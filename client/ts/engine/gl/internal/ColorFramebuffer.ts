import { GameContext } from "../../GameContext";
import { Framebuffer } from "../Framebuffer";
import { ColorTexture } from "./ColorTexture";
import { DepthTexture } from "./DepthTexture";
import { FloatColorTexture } from "./FloatColorTexture";

export class ColorFramebuffer implements Framebuffer {
  dims: [number, number];

  private colorTexture: FloatColorTexture | ColorTexture;
  private depthTexture: DepthTexture;
  private fb: WebGLFramebuffer;
  private gl: WebGLRenderingContext;

  constructor(ctx: GameContext, dims: [number, number]) {
    const floatattach = !!(ctx.getGLExtension("WEBGL_color_buffer_float"));
    if (floatattach) {
      this.colorTexture = new FloatColorTexture(ctx, dims);
    } else {
      this.colorTexture = new ColorTexture(ctx, dims);
    }
    
    this.depthTexture = new DepthTexture(ctx, dims);
    this.gl = ctx.getGLContext();

    let gl = this.gl;
    this.fb = gl.createFramebuffer();
    this.setFramebufferSize(dims);
  }

  getColorTexture() {
    return this.colorTexture;
  }

  getDepthTexture() {
    return this.depthTexture;
  }

  setFramebufferSize(dim_a: [number, number] | number, dim_b?: number) {
    this.colorTexture.setDimensions(dim_a, dim_b);
    this.depthTexture.setDimensions(dim_a, dim_b);

    this.colorTexture.attachToFramebuffer(this.fb);
    this.depthTexture.attachToFramebuffer(this.fb);
    this.dims = (typeof dim_a === "number" ? [dim_a, dim_b] : dim_a) as [number, number];
  }

  bindFramebuffer(target?: number) {
    let targ = target;
    if (!targ) {
      targ = this.gl.FRAMEBUFFER;
    }

    this.gl.bindFramebuffer(targ, this.fb);
  }


}