import { GameContext } from "../../GameContext";
import { SamplingMode, Texture, TextureFormat } from "../Texture";

export class FloatColorTexture extends Texture {
  dims: [number, number];
  ctx: GameContext;
  private tex: WebGLTexture;
  private floatSupport: boolean;

  constructor(ctx: GameContext, dims: [number, number]) {
    super();
    this.ctx = ctx;
    this.tex = null;
    this.setDimensions(dims);
    this.floatSupport = !!(ctx.getGLExtension("OES_texture_float"));
  }

  getTextureFormat() {
    return TextureFormat.RGBA;
  }

  setSamplingMode(mode: SamplingMode) {
    // float texture linear sampling?
    return this.handleTextureSampling(this.tex, this.ctx.getGLContext(), mode);
  }

  bindToUniform(location: WebGLUniformLocation, index: number) {
    const gl = this.ctx.getGLContext();
    if (index > 31) {
      console.error("OOB index");
      throw Error("OOB index");
    }

    gl.activeTexture(gl.TEXTURE0 + index);
    gl.bindTexture(gl.TEXTURE_2D, this.tex);
    gl.uniform1i(location, index);
  }

  setDimensions(dim_a: [number, number] | number, dim_b?: number) {
    let dims : [number, number] = (typeof dim_a === "number" ? [dim_a, dim_b] : dim_a);
    this.createColorTextureWithDims(dims[0], dims[1]);
    this.dims = dims;
  }

  attachToFramebuffer(framebuffer: WebGLFramebuffer, target?: number) {
    let targ = target;
    let gl = this.ctx.getGLContext();
    if (target === undefined) {
      targ = gl.COLOR_ATTACHMENT0;
    }

    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    gl.bindTexture(gl.TEXTURE_2D, this.tex);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.tex, 0);
  }

  private createColorTextureWithDims(x: number, y: number) {
    let gl = this.ctx.getGLContext();
    if (this.tex === null) {
      this.tex = gl.createTexture();
    }

    gl.bindTexture(gl.TEXTURE_2D, this.tex);
    // fall back on byte tex if necessary
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, x, y, 0, gl.RGBA, this.floatSupport ? gl.FLOAT : gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    // gl_repeat incompatible with npot textures :(
    // have to solve it in shader if necessary :)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  }
}