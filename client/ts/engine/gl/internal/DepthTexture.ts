import { GameContext } from "../../GameContext";
import { SamplingMode, Texture, TextureFormat } from "../Texture";

let depthtex: WEBGL_depth_texture = undefined;

// TODO: come up with a debug view that lets you view shadows :)
// probably engine side
// grab framebuffers after every render pass, just return the moment the desired fb is complete
export class DepthTexture extends Texture {
  ctx: GameContext;
  dims: [number, number];
  gl: WebGLRenderingContext;
  private tex: WebGLTexture;
  constructor(ctx: GameContext, dims: [number, number]) {
    super();
    this.ctx = ctx;
    this.gl = ctx.getGLContext();
    this.tex = null;
    if (depthtex === undefined) {
      depthtex = ctx.getGLExtension("WEBGL_depth_texture");
      if (depthtex !== null) {
        console.log("ok :)");
      }
    }

    if (depthtex === null) {
      let err = "Depth texture not supported on this device.";
      console.error(err);
      throw Error(err);
    }

    this.setDimensions(dims);
  }

  getTextureFormat() {
    return TextureFormat.DEPTH;
  }

  setSamplingMode(mode: SamplingMode) {
    return this.handleTextureSampling(this.tex, this.ctx, mode);
  }

  bindToUniform(location: WebGLUniformLocation, index: number) {
    let gl = this.gl;
    if (index > 31 || index < 0) {
      console.error("OOB index");
      throw Error("OOB index");
    }
    
    const wrap = this.ctx.getGL();
    wrap.bindTexture(this.tex, gl.TEXTURE_2D, location);
  }

  setDimensions(dim_a: [number, number] | number, dim_b?: number) {
    // conform to power of two
    let dims = this.validateTextureSize(dim_a, dim_b);
    this.createDepthTextureWithDims(dims[0], dims[1]);
    this.dims = dims;
  }

  /**
   * Attaches this texture to the depth component of the provided framebuffer,
   * or the provided target.
   * @param target - the desired target. Defaults to gl.DEPTH_COMPONENT.
   */
  attachToFramebuffer(framebuffer: WebGLFramebuffer, target?: number) {
    let targ = target;
    let gl = this.gl;
    if (!target) {
      targ = gl.DEPTH_ATTACHMENT;
    }

    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, targ, gl.TEXTURE_2D, this.tex, 0);
  }

  private validateTextureSize(dim_a: [number, number] | number, dim_b: number) : [number, number] {
    let dims : [number, number] = (typeof dim_a === "number" ? [dim_a, dim_b] : dim_a);
    return dims;
  }

  private createDepthTextureWithDims(x: number, y: number) {
    const ver = this.ctx.webglVersion;
    const gl = this.gl;
    if (this.tex === null) {
      this.tex = gl.createTexture();
      console.log("texture created :)");
    }

    let internalFormat: number, type: number;
    if (ver === 2) {
      const gl = this.ctx.getGLContext() as WebGL2RenderingContext;
      internalFormat = gl.DEPTH_COMPONENT32F;
      type = gl.FLOAT;
    } else {
      internalFormat = gl.DEPTH_COMPONENT;
      type = gl.UNSIGNED_INT;
    }


    const wrap = this.ctx.getGL();

    gl.activeTexture(wrap.bindTexture(this.tex, gl.TEXTURE_2D));
    gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, x, y, 0, gl.DEPTH_COMPONENT, type, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  }
}