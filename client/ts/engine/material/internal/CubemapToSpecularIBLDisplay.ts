import { vec3 } from "gl-matrix";
import { GameContext } from "../../GameContext";
import { ColorCubemap } from "../../gl/ColorCubemap";
import { ShaderProgramBuilder } from "../../gl/ShaderProgramBuilder";
import { getEnginePath } from "../../internal/getEnginePath";
import { screenCoords, TextureDisplay } from "../TextureDisplay";
import { CubemapCoords } from "./CubemapCoords";

export class CubemapToSpecularIBLDisplay implements CubemapCoords {
  center: vec3;
  right: vec3;
  up: vec3;
  roughness: number;
  cubemapRes: number;
  destRes: number;

  private posLoc: number;
  private ctx: GameContext;
  private compilePromise: Promise<any>;
  private tex: ColorCubemap;
  private prog: WebGLProgram;
  private buf: WebGLBuffer;

  private unifs: {
    center: WebGLUniformLocation,
    right: WebGLUniformLocation,
    up: WebGLUniformLocation,
    skybox: WebGLUniformLocation,
    roughness: WebGLUniformLocation,
    sourceDestRes: WebGLUniformLocation
  };

  constructor(ctx: GameContext, cubemap: ColorCubemap) {
    this.tex = cubemap;
    this.ctx = ctx;

    this.center = vec3.create();
    this.right = vec3.create();
    this.up = vec3.create();

    this.roughness = 0.0;
    this.cubemapRes = 256;

    this.prog = null;

    this.compilePromise = new ShaderProgramBuilder(ctx)
      .withVertexShader(getEnginePath("engine/glsl/iblspecular/iblspecular.vert"))
      .withFragmentShader(getEnginePath("engine/glsl/iblspecular/iblspecular.frag"))
      .build()
      .then(this.configureProgram.bind(this));
  }

  async waitUntilCompiled() {
    await this.compilePromise;
  }

  private configureProgram(res: WebGLProgram) {
    this.prog = res;
    const gl = this.ctx.getGLContext();
    const wrap = this.ctx.getGL();
    this.posLoc = gl.getAttribLocation(res, "aPosition");
    this.unifs = {
      center: gl.getUniformLocation(res, "center"),
      right: gl.getUniformLocation(res, "right"),
      up: gl.getUniformLocation(res, "up"),
      skybox: gl.getUniformLocation(res, "skybox"),
      roughness: gl.getUniformLocation(res, "roughness"),
      sourceDestRes: gl.getUniformLocation(res, "sourceDestRes")
    };

    this.buf = gl.createBuffer();
    wrap.bindBuffer(gl.ARRAY_BUFFER, this.buf);
    gl.bufferData(gl.ARRAY_BUFFER, screenCoords, gl.STATIC_DRAW);
  }

  draw() {
    if (this.prog !== null && this.tex !== null) {
      const gl = this.ctx.getGLContext();
      const prog = this.prog;
      const wrap = this.ctx.getGL();

      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      wrap.bindBuffer(gl.ARRAY_BUFFER, this.buf);
      wrap.useProgram(prog);
      gl.uniform3fv(this.unifs.center, this.center);
      gl.uniform3fv(this.unifs.right, this.right);
      gl.uniform3fv(this.unifs.up, this.up);
      wrap.uniform1f(this.unifs.roughness, this.roughness);
      gl.uniform2f(this.unifs.sourceDestRes, this.cubemapRes, this.destRes);
      this.tex.bindToUniform(this.unifs.skybox, 1);

      gl.vertexAttribPointer(this.posLoc, 2, gl.FLOAT, false, 0, 0);
      gl.enableVertexAttribArray(this.posLoc);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
  
      gl.disableVertexAttribArray(this.posLoc);
    }
  }
}