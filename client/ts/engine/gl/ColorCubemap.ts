import { GameContext } from "../GameContext";
import { Cubemap } from "./Cubemap";
import { TextureFormat } from "./Texture";

export class ColorCubemap implements Cubemap {
  private ctx: GameContext;
  private cube: WebGLTexture;
  readonly dims: number;

  /**
   * Creates a new Cubemap
   * @param ctx - gamecontext
   * @param dims - size of each cube face
   */
  constructor(ctx: GameContext, dim: number) {
    // note: what about shadow cubemaps?
    // what happens when I need those?
    this.ctx = ctx;
    const gl = this.ctx.getGLContext();
    this.cube = gl.createTexture();

    ctx.getGLExtension("OES_texture_float");
    ctx.getGLExtension("OES_texture_float_linear");
    // firefox complains about this???
    ctx.getGLExtension("WEBGL_color_buffer_float");
    this.dims = dim;

    gl.bindTexture(gl.TEXTURE_CUBE_MAP, this.cube);

    // lule
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    for (let i = 0; i < 6; i++) {
      // alloc our textures
      gl.texImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_X + i, 0, gl.RGBA, dim, dim, 0, gl.RGBA, gl.FLOAT, null);
    }
  }

  generateMipmaps() {
    // "lazy texture initialization on level 0"
    // no idea what this means but i assume it has something to do with the crash before load
    const gl = this.ctx.getGLContext();
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, this.cube);
    gl.generateMipmap(gl.TEXTURE_CUBE_MAP);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
  }

  attachToFramebuffer(face: number, framebuffer: WebGLFramebuffer, mipLevel?: number, target?: number) {
    let mip = mipLevel;
    let targ = target;
    const gl = this.ctx.getGLContext();

    if (mip === undefined) {
      mip = 0;
    }

    if (targ === undefined) {
      targ = gl.COLOR_ATTACHMENT0;
    }

    const off = face - gl.TEXTURE_CUBE_MAP_POSITIVE_X;
    if (off < 0 || off > 5) {
      console.warn("Invalid face for bind call: " + face);
      return;
    }

    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, this.cube);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, targ, face, this.cube, mip);
  }

  bindToUniform(location: WebGLUniformLocation, index: number) {
    const gl = this.ctx.getGLContext();
    if (index > 31 || index < 0) {
      const err = "OOB index";
      console.error(err);
      throw Error(err);
    }

    gl.activeTexture(gl.TEXTURE0 + index);
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, this.cube);
    gl.uniform1i(location, index);
  }

  bindCubemap(location?: number, index?: number) {
    const gl = this.ctx.getGLContext();
    let loc : number;
    let slot: number;
    if (location === undefined) {
      loc = gl.TEXTURE_CUBE_MAP;
    } else {
      loc = location;
    }

    if (index === undefined || (index < 0 || index >= 32)) {
      slot = gl.TEXTURE0;
    } else {
      slot = gl.TEXTURE0 + index;
    }

    gl.activeTexture(slot);
    gl.bindTexture(loc, this.cube);
  }

  getTextureFormat() {
    return TextureFormat.RGBA;
  }
}
