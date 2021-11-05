import { GameContext } from "../../GameContext";
import { ColorCubemap } from "../ColorCubemap";
import { DepthStencilRenderbuffer } from "./DepthStencilRenderbuffer";

// special framebuffer which is intended for rendering skyboxes
// supports reattaching different color buffers

// can't use default framebuffer because we don't meet the spec
// this one is new!
export class SkyboxFramebuffer {
  private ctx: GameContext;
  private fb: Array<WebGLFramebuffer>;
  private rb: Array<DepthStencilRenderbuffer>;
  private cubemap: ColorCubemap;
  
 readonly dim: number;

  constructor(ctx: GameContext, dim: number) {
    this.cubemap = new ColorCubemap(ctx, dim);
    this.fb = [];
    this.rb = [];
    this.dim = dim;
    this.ctx = ctx;

    this.createFramebuffers();
  }

  private createFramebuffers() {
    const gl = this.ctx.getGLContext();
    for (let i = 0; i < 6; i++) {
      const fb = gl.createFramebuffer();
      gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
      const rb = new DepthStencilRenderbuffer(this.ctx, [this.dim, this.dim]);
      this.cubemap.attachToFramebuffer(gl.TEXTURE_CUBE_MAP_POSITIVE_X + i, fb, gl.COLOR_ATTACHMENT0);
      rb.attachToFramebuffer(fb);
      if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
        console.log("SKYBOX FRAMEBUFFER INCOMPLETE");
      }

      this.fb.push(fb);
      this.rb.push(rb);
    }
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

    gl.bindFramebuffer(targ, this.fb[face - gl.TEXTURE_CUBE_MAP_POSITIVE_X]);
  }

  // get cubemap: return cubemap obj
  getCubemap() {
    return this.cubemap;
  }
}