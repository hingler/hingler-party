import { GameContext } from "../../GameContext";
import { ColorCubemap } from "../ColorCubemap";
import { DepthStencilRenderbuffer } from "./DepthStencilRenderbuffer";

// special framebuffer which is intended for rendering skyboxes
// supports reattaching different color buffers

// can't use default framebuffer because we don't meet the spec
// this one is new!
export class SkyboxFramebuffer {
  private ctx: GameContext;
  private fb: WebGLFramebuffer;
  private rb: DepthStencilRenderbuffer;
  private cubemap: ColorCubemap;

  private mipLevel: number;

  private fboMipmap: boolean;
  
  readonly dim_: number;

  constructor(ctx: GameContext, dim: number) {
    this.mipLevel = -1;
    this.dim_ = dim;
    this.cubemap = new ColorCubemap(ctx, dim);
    this.cubemap.generateMipmaps();
    const gl = ctx.getGLContext();
    this.fb = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fb);
    this.rb = new DepthStencilRenderbuffer(ctx, [dim, dim]);
    this.rb.attachToFramebuffer(this.fb);
    this.ctx = ctx;
    this.setMipLevel(0);
    this.fboMipmap = !!(this.ctx.getGLExtension("OES_fbo_render_mipmap"));
  }

  get dim() {
    return Math.round(Math.pow(0.5, this.mipLevel) * this.dim_);
  }

  /**
   * Sets the mip level of this framebuffer
   * @param mip - the desired mip level
   * @returns true if the fb mipmap level could be set -- false otherwise.
   */
  setMipLevel(mip: number) : boolean {
    const newMip = Math.round(mip);
    if (!this.fboMipmap && newMip !== 0) {
      // ensure we can load our mip0
      return false;
    }

    if (newMip !== this.mipLevel) {
      this.mipLevel = newMip;
      const mipRes = Math.round(this.dim);
      this.rb.setDimensions(mipRes, mipRes);
      this.rb.attachToFramebuffer(this.fb);
    }

    return true;
  }

  // bind framebuffer: specify face
  bindFramebuffer(face: number, target?: number) {
    const gl = this.ctx.getGLContext();

    let targ = target;
    if (!targ) {
      targ = gl.FRAMEBUFFER;
    }

    const d = face - gl.TEXTURE_CUBE_MAP_POSITIVE_X;

    if (d > 5 || d < 0) {
      console.warn("Invalid cube face specified to SkyboxFramebuffer: " + face.toString(16));
      return;
    }

    gl.bindFramebuffer(targ, this.fb);
    this.cubemap.attachToFramebuffer(face, this.fb, this.mipLevel, gl.COLOR_ATTACHMENT0);
  }

  // get cubemap: return cubemap obj
  getCubemap() {
    return this.cubemap;
  }
}