import { GameContext } from "../../GameContext";
import { Framebuffer } from "../Framebuffer";

export class DepthStencilRenderbuffer {
  private _dims: [number, number];
  private rb: WebGLRenderbuffer;
  private gl: WebGLRenderingContext;

  constructor(ctx: GameContext, dims: [number, number]) {
    this.gl = ctx.getGLContext();
    this.rb = null;
    this.setDimensions(dims);
  }

  setDimensions(dim_a: [number, number] | number, dim_b?: number) {
    let d : [number, number] = (typeof dim_a === "number" ? [dim_a, dim_b] : dim_a);
    this.createRenderBufferWithDims(d);
    this._dims = d;
  }

  private createRenderBufferWithDims(dims: [number, number]) {
    let gl = this.gl;
    if (this.rb === null) {
      this.rb = gl.createRenderbuffer();
    }

    gl.bindRenderbuffer(gl.RENDERBUFFER, this.rb);
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_STENCIL, dims[0], dims[1]);
  }

  attachToFramebuffer(fb: WebGLFramebuffer) {
    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, fb);
    this.gl.bindRenderbuffer(this.gl.RENDERBUFFER, this.rb);
    this.gl.framebufferRenderbuffer(this.gl.FRAMEBUFFER, this.gl.DEPTH_STENCIL_ATTACHMENT, this.gl.RENDERBUFFER, this.rb);
  }

  get dims() {
    return this._dims;
  }
}