import { Future } from "../../../../ts/util/task/Future";
import { ShaderProgramBuilder } from "../gl/ShaderProgramBuilder";
import { Texture } from "../gl/Texture";
import { GameContext } from "../GameContext";
import { Task } from "../../../../ts/util/task/Task";

// fucking 
export const screenCoords = new Float32Array([
  1, 1, -1, 1, -1, -1, 1, 1, -1, -1, 1, -1
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

  constructor(ctx: GameContext, vert: string, frag: string, texture: Texture | Future<Texture>) {
    this.ctx = ctx;
    this.tex = null;
    if (texture instanceof Texture) {
      this.tex = texture;
    } else {
      if (texture.valid()) {
        this.tex = texture.get();
      } else {
        texture.wait().then((tex) => { this.tex = tex });
      }
    }

    let gl = this.ctx.getGLContext();
    this.prog = null;
    let shaderTask = new Task<WebGLProgram>();
    new ShaderProgramBuilder(ctx)
      .withVertexShader(vert)
      .withFragmentShader(frag)
      .build()
      .then((res) => { this.configureProgram(res); return res; })
      .then(shaderTask.resolve.bind(shaderTask));

    this.shaderFuture = shaderTask.getFuture();

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

  // returns the game context for this object :3
  protected getContext() {
    return this.ctx;
  }

  // fetches the descriptor for the compiled GL program
  protected getProgram() {
    return this.prog;
  }

  // override as needed -- called after compilation, allowing the extender
  // to configure any necessary uniforms.
  protected configureProgram(prog: WebGLProgram) {
    // nop
  }

  /**
   * Called on every draw call, after the program has been bound.
   * @param prog - the corresponding program.
   */
  protected abstract prepareUniforms(prog: WebGLProgram) : void;

  getShaderFuture() {
    return this.shaderFuture;
  }

  drawTexture() {
    let gl = this.ctx.getGLContext();
    if (this.prog === null) {
      if (this.shaderFuture.valid()) {
        this.prog = this.shaderFuture.get();
        this.prepareAttributes();
      }
    }
    
    if (this.prog !== null && this.tex !== null) {
      gl.useProgram(this.prog);
      this.prepareUniforms(this.prog);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.buf);
      
      gl.vertexAttribPointer(this.attribs.pos, 2, gl.FLOAT, false, 0, 0);
      gl.enableVertexAttribArray(this.attribs.pos);
      
      this.tex.bindToUniform(this.locs.tex, 1);
      gl.drawArrays(gl.TRIANGLES, 0, 6);

      gl.disableVertexAttribArray(this.attribs.pos);
    } else {
      if (this.prog === null) {
        console.debug("TextureDisplay program was null!");
      }

      if (this.tex === null) {
        console.debug("TextureDisplay texture was null!");
      }
    }
  }
}