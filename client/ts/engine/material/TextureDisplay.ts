import { Future } from "../../../../ts/util/task/Future";
import { ShaderProgramBuilder } from "../gl/ShaderProgramBuilder";
import { Texture } from "../gl/Texture";
import { GameContext } from "../GameContext";

// fucking 
export const screenCoords = new Float32Array([
  -1, 1, 1, 1, -1, -1, -1, -1, 1, 1, 1, -1
]);

export abstract class TextureDisplay {
  private prog: WebGLProgram;
  private ctx: GameContext;
  private buf: WebGLBuffer;
  private tex: Texture;
  private shaderFuture: Future<WebGLProgram>;

  private attribs: {
    pos: number
  };

  private locs: {
    tex: WebGLUniformLocation;
  }

  constructor(ctx: GameContext, vert: string, frag: string, texture: Texture) {
    this.ctx = ctx;
    this.tex = texture;
    let gl = this.ctx.getGLContext();
    this.prog = null;
    this.shaderFuture = new ShaderProgramBuilder(ctx)
      .withVertexShader(vert)
      .withFragmentShader(frag)
      .buildFuture();

    this.buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buf);
    gl.bufferData(gl.ARRAY_BUFFER, screenCoords, gl.STATIC_DRAW);
  }

  prepareAttributes() {
    let gl = this.ctx.getGLContext();
    this.attribs = {
      pos: gl.getAttribLocation(this.prog, "aPosition")
    };

    this.locs = {
      tex: gl.getUniformLocation(this.prog, "tex")
    };
  }

  protected getContext() {
    return this.ctx;
  }

  /**
   * Called on every draw call.
   * @param prog - the corresponding program. Used to fetch uniform locations.
   */
  protected abstract prepareUniforms(prog: WebGLProgram) : void;

  drawTexture() {
    let gl = this.ctx.getGLContext();
    if (this.prog === null) {
      if (this.shaderFuture.valid()) {
        this.prog = this.shaderFuture.get();
        this.prepareAttributes();
      }
    }
    
    if (this.prog !== null) {
      gl.useProgram(this.prog);
      this.prepareUniforms(this.prog);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.buf);
      
      gl.vertexAttribPointer(this.attribs.pos, 2, gl.FLOAT, false, 0, 0);
      gl.enableVertexAttribArray(this.attribs.pos);
      
      this.tex.bindToUniform(this.locs.tex, 1);
      gl.drawArrays(gl.TRIANGLES, 0, 6);

      gl.disableVertexAttribArray(this.attribs.pos);
    }
  }
}