import { GameContext } from "../../GameContext";
import { SamplingMode, Texture, TextureFormat, WrapMode } from "../Texture";

export enum BitDepth {
  BYTE = 1,
  HALF_FLOAT = 2,
  FLOAT = 3
}

export class ColorTexture extends Texture {
  dims: [number, number];
  ctx: GameContext;
  gl: WebGLRenderingContext;
  private tex: WebGLTexture;

  private internalformat: number;
  private format: number;
  private bitdepth: number;
  private floatsupport: boolean;
  private halffloatsupport: boolean;

  private floatlinearsupport: boolean;
  private floatrendersupport: boolean;

  private halffloatlinearsupport: boolean;
  private halffloatrendersupport: boolean;

  private depth: BitDepth;
  
  constructor(ctx: GameContext, dims: [number, number], channelCount?: number, bitDepth?: BitDepth) {
    super();
    this.ctx = ctx;
    this.gl = ctx.getGLContext();
    this.tex = null;
    // not necc
    const floatTexSupport = this.ctx.getGLExtension("OES_texture_float_linear");
    this.floatlinearsupport = !!floatTexSupport;
    const floatRenderSupport = this.ctx.getGLExtension("EXT_color_buffer_float");
    this.floatrendersupport = !!floatRenderSupport;
    // always supported in gl2
    this.floatsupport = true;
    const gl2 = (this.ctx.webglVersion === 2);
    let depthWrap = (bitDepth ? bitDepth : BitDepth.BYTE);
    
    if (!gl2) {
      this.floatsupport = !!this.ctx.getGLExtension("OES_texture_float");
      this.halffloatsupport = !!this.ctx.getGLExtension("OES_texture_half_float");
      this.halffloatsupport &&= !!this.ctx.getGLExtension("OES_texture_half_float_linear");
    } else {
      this.halffloatsupport = !!floatRenderSupport;
    }

    if (depthWrap === BitDepth.FLOAT) {
      if (!floatTexSupport) {
        console.warn("This platform does not support filtering floating point textures.");
      }

      // should client be held responsible for enforcing these?
      // how about we downgrade ad hoc? shouldn't make a difference since to get it working we'll have to do that anyway.
      if (!floatRenderSupport) {
        console.warn("This platform does not support rendering to floating point textures.");
      }

      if (!this.floatsupport) {
        depthWrap = BitDepth.HALF_FLOAT;
      }
    }

    if (depthWrap === BitDepth.HALF_FLOAT) {
      if (!this.halffloatsupport) {
        // downgrade to unsigned byte
        depthWrap = BitDepth.BYTE;
      } else {
        depthWrap = BitDepth.HALF_FLOAT;
      }
    }

    if (gl2) {
      this.setFormatAndInternalFormat_WEBGL2(this.gl as WebGL2RenderingContext, channelCount, depthWrap);
    } else {
      this.setFormatAndInternalFormat_WEBGL(this.gl, channelCount, depthWrap);
    }

    this.bitdepth = (depthWrap === BitDepth.BYTE ? this.gl.UNSIGNED_BYTE : this.gl.FLOAT);
    if (!gl2 && depthWrap === BitDepth.HALF_FLOAT) {
      this.bitdepth = (this.ctx.getGLExtension("OES_texture_half_float").HALF_FLOAT_OES);
    }

    console.log(depthWrap);
    console.log(this.bitdepth);
    console.log(this.internalformat);
    console.log(this.format);
    this.setDimensions(dims);

    this.depth = depthWrap;
  }

  private setFormatAndInternalFormat_WEBGL2(gl: WebGL2RenderingContext, channelCount?: number, depth?: BitDepth) {
    const f = (depth === BitDepth.FLOAT);
    const hf = (depth === BitDepth.HALF_FLOAT);
    const channels = (channelCount === undefined ? 4 : Math.round(Math.max(Math.min(channelCount, 4), 1)));
    switch (channels) {
      case 1:
        this.internalformat = (f ? gl.R32F : (hf ? gl.R16F : gl.R8));
        this.format = gl.RED;
        break;
      case 2:
        this.internalformat = (f ? gl.RG32F : (hf ? gl.RG16F : gl.RG8));
        this.format = gl.RG;
        break;
      case 3:
        this.internalformat = (f ? gl.RGB32F : (hf ? gl.RGB16F : gl.RGB8));
        this.format = gl.RGB;
        break;
      case 4:
        this.internalformat = (f ? gl.RGBA32F : (hf ? gl.RGBA16F : gl.RGBA8));
        this.format = gl.RGBA;
        break;
    }
  }

  private setFormatAndInternalFormat_WEBGL(gl: WebGLRenderingContext, channelCount?: number, depth?: BitDepth) {
    const channels = (channelCount === undefined ? 4 : Math.round(Math.max(Math.min(channelCount, 4), 1)));
    switch (channels) {
      case 1:
        this.internalformat = gl.LUMINANCE;
        break;
      case 2:
        this.internalformat = gl.LUMINANCE_ALPHA;
        break;
      case 3:
        this.internalformat = gl.RGB;
        break;
      case 4:
        this.internalformat = gl.RGBA;
        break;
    }

    this.format = this.internalformat;
  }

  getTextureFormat() {
    return TextureFormat.RGBA;
  }

  getBitDepth() {
    return this.depth;
  }

  setSamplingMode(mode: SamplingMode) {
    return this.handleTextureSampling(this.tex, this.gl, mode);
  }

  setWrapMode(modeS: WrapMode, modeT?: WrapMode) {
    const wrapS = modeS;
    const wrapT = (modeT === undefined ? modeS : modeT);
    this.handleWrapMode(this.tex, this.gl, wrapS, wrapT);
  }

  bindToUniform(location: WebGLUniformLocation, index: number) {
    let gl = this.gl;
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
    let gl = this.gl;
    if (target === undefined) {
      targ = gl.COLOR_ATTACHMENT0;
    }

    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    gl.bindTexture(gl.TEXTURE_2D, this.tex);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.tex, 0);
  }

  private createColorTextureWithDims(x: number, y: number) {
    let gl = this.gl;
    if (this.tex === null) {
      this.tex = gl.createTexture();
    }

    gl.bindTexture(gl.TEXTURE_2D, this.tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, this.internalformat, x, y, 0, this.format, this.bitdepth, null);
    
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    // gl_repeat incompatible with npot textures :(
    // have to solve it in shader if necessary :)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  }
}