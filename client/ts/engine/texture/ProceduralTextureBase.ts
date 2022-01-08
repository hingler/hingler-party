/**
 * A base for procedural materials which handles a lot of the boilerplate
 */

import { ReadonlyVec2, vec2 } from "gl-matrix";
import { GameContext } from "../GameContext";
import { ColorAttachFramebuffer } from "../gl/internal/ColorAttachFramebuffer";
import { ColorTexture } from "../gl/internal/ColorTexture";
import { ShaderProgramBuilder } from "../gl/ShaderProgramBuilder";
import { getEnginePath } from "../internal/getEnginePath";
import { getFullScreenQuadBuffer } from "../material/getFullScreenQuadBuffer";

export class ProceduralTextureBase {
  private pos : number;
  private buf : WebGLBuffer;
  private ctx : GameContext;
  private prog : WebGLProgram;
  private prom : Promise<void>;
  private fb: ColorAttachFramebuffer;
  private dims: ReadonlyVec2;

  constructor(ctx: GameContext, fragPath: string, dims: ReadonlyVec2, ...flags: string[]) {
    this.ctx = ctx;
    this.buf = getFullScreenQuadBuffer(ctx);
    this.prom = new ShaderProgramBuilder(ctx)
      .withVertexShader(getEnginePath("engine/glsl/texturexfer/texturexfer.vert"))
      .withFragmentShader(fragPath)
      .withFlags(...flags)
      .build()
      .then(this.configureProgram.bind(this));

    this.dims = Array.from(dims) as [number, number];

    this.fb = new ColorAttachFramebuffer(ctx);
  }

  protected getContext() {
    return this.ctx;
  }

  async waitUntilCompiled() {
    await this.prom;
  }

  private configureProgram(prog: WebGLProgram) {
    const gl = this.ctx.getGLContext();
    this.pos = gl.getAttribLocation(prog, "aPosition"); 
    this.bindUniforms(prog);
    this.prog = prog;
  }

  /**
   * Implemented by subclasses which intend to bind custom uniforms.
   * @param prog - program
   */
  protected bindUniforms(prog: WebGLProgram) {
    // nop
  }

  draw() : ColorTexture {
    if (this.prog !== null) {
      const gl = this.ctx.getGLContext();
      const res = new ColorTexture(this.ctx, Array.from(this.dims) as [number, number]);
      this.fb.setColorTexture(res);
      this.fb.bindFramebuffer(gl.FRAMEBUFFER);

      gl.viewport(0, 0, this.dims[0], this.dims[1]);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      
      gl.useProgram(this.prog);
      this.assignUniforms();

      gl.bindBuffer(gl.ARRAY_BUFFER, this.buf);
      gl.vertexAttribPointer(this.pos, 2, gl.FLOAT, false, 0, 0);
      gl.enableVertexAttribArray(this.pos);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      gl.disableVertexAttribArray(this.pos);
      return res;
    } else {
      console.log("oops");
      return null;
    }
  }

  /**
   * Implemented by subclasses, assign uniforms here
   */
  protected assignUniforms() {

  }
}