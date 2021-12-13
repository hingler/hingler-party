import { vec3 } from "gl-matrix";
import { GameContext } from "../../GameContext";
import { Cubemap } from "../../gl/Cubemap";
import { ShaderProgramBuilder } from "../../gl/ShaderProgramBuilder";
import { getEnginePath } from "../../internal/getEnginePath";
import { screenCoords } from "../TextureDisplay";
import { CubemapCoords } from "./CubemapCoords";

export class CubemapToDiffuseIBLDisplay implements CubemapCoords {
  center: vec3;
  right: vec3;
  up: vec3;

  private posLoc: number;

  private ctx: GameContext;
  private compilePromise: Promise<any>;

  private tex: Cubemap;
  private prog: WebGLProgram;

  private buf: WebGLBuffer;

  private unifs: {
    center: WebGLUniformLocation,
    right: WebGLUniformLocation,
    up: WebGLUniformLocation,
    skybox: WebGLUniformLocation
  };

  constructor(ctx: GameContext, tex: Cubemap) {
    this.tex = tex;
    this.ctx = ctx;

    this.center = vec3.create();
    this.right = vec3.create();
    this.up = vec3.create();

    this.prog = null;

    this.compilePromise = new ShaderProgramBuilder(ctx)
      .withVertexShader(getEnginePath("engine/glsl/ibldiffuse/ibldiffuse.vert"))
      .withFragmentShader(getEnginePath("engine/glsl/ibldiffuse/ibldiffuse.frag"))
      .build()
      .then(this.configureProgram.bind(this));
  }

  async waitUntilCompiled() {
    await this.compilePromise;
  }

  private configureProgram(res: WebGLProgram) {
    this.prog = res;
    const gl = this.ctx.getGLContext();
    this.posLoc = gl.getAttribLocation(res, "aPosition");
    this.unifs = {
      center: gl.getUniformLocation(res, "center"),
      right: gl.getUniformLocation(res, "right"),
      up: gl.getUniformLocation(res, "up"),
      skybox: gl.getUniformLocation(res, "skybox")
    };

    this.buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buf);
    gl.bufferData(gl.ARRAY_BUFFER, screenCoords, gl.STATIC_DRAW);
  }

  draw() {
    if (this.prog !== null && this.tex !== null) {
      const gl = this.ctx.getGLContext();
      const prog = this.prog;
  
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.buf);
  
      gl.useProgram(prog);
      gl.uniform3fv(this.unifs.center, this.center);
      gl.uniform3fv(this.unifs.right, this.right);
      gl.uniform3fv(this.unifs.up, this.up);
      this.tex.bindToUniform(this.unifs.skybox, 1);
  
      gl.vertexAttribPointer(this.posLoc, 2, gl.FLOAT, false, 0, 0);
      gl.enableVertexAttribArray(this.posLoc);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
  
      gl.disableVertexAttribArray(this.posLoc);
    }
  }
}