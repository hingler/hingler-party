import { GameContext } from "../../GameContext";
import { ShaderProgramBuilder } from "../../gl/ShaderProgramBuilder";
import { getEnginePath } from "../../internal/getEnginePath";
import { screenCoords } from "../TextureDisplay";

export class BRDFLutDisplay {
  private posLoc: number;
  private prog: WebGLProgram;
  private ctx: GameContext;
  private compilePromise: Promise<any>;

  private buf: WebGLBuffer;

  constructor(ctx: GameContext) {
    this.prog = null;
    this.ctx = ctx;
    
    ctx.getGLExtension("OES_standard_derivatives");

    this.compilePromise = new ShaderProgramBuilder(ctx)
      .withVertexShader(getEnginePath("engine/glsl/ibllut/ibllut.vert"))
      .withFragmentShader(getEnginePath("engine/glsl/ibllut/ibllut.frag"))
      .build()
      .then(this.configureProgram.bind(this));

  }

  async waitUntilCompiled() {
    await this.compilePromise;
  }

  private configureProgram(res: WebGLProgram) {
    const gl = this.ctx.getGLContext();
    const wrap = this.ctx.getGL();
    this.prog = res;
    this.posLoc = gl.getAttribLocation(res, "aPosition");
    this.buf = gl.createBuffer();
    wrap.bindBuffer(gl.ARRAY_BUFFER, this.buf);
    gl.bufferData(gl.ARRAY_BUFFER, screenCoords, gl.STATIC_DRAW);
  }

  draw() {
    if (this.prog !== null) {
      const gl = this.ctx.getGLContext();
      const wrap = this.ctx.getGL();
      
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      wrap.bindBuffer(gl.ARRAY_BUFFER, this.buf);
      wrap.useProgram(this.prog);
      gl.vertexAttribPointer(this.posLoc, 2, gl.FLOAT, false, 0, 0);
      gl.enableVertexAttribArray(this.posLoc);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      gl.disableVertexAttribArray(this.posLoc);
    }
  }
}