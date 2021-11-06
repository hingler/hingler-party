import { mat3, mat4, ReadonlyMat4 } from "gl-matrix";
import { GameContext } from "../GameContext";
import { Cubemap } from "../gl/Cubemap";
import { ShaderProgramBuilder } from "../gl/ShaderProgramBuilder";
import { getEnginePath } from "../internal/getEnginePath";
import { AttributeType, Model } from "../model/Model";
import { Material } from "./Material";

// renders a skybox :D
export class SkyboxMaterial implements Material {
  private prog: WebGLProgram;
  private ctx: GameContext;

  view: ReadonlyMat4;
  persp: ReadonlyMat4;
  cube: Cubemap;

  private posLoc: number;

  private unifs: {
    uViewmat: WebGLUniformLocation,
    uPersmat: WebGLUniformLocation,
    uCubemap: WebGLUniformLocation
  };

  constructor(ctx: GameContext) {
    this.view = mat4.create();
    this.persp = mat4.create();
    this.cube = null;
    this.prog = null;
    this.ctx = ctx;

    new ShaderProgramBuilder(ctx)
      .withVertexShader(getEnginePath("engine/glsl/skybox/skybox.vert"))
      .withFragmentShader(getEnginePath("engine/glsl/skybox/skybox.frag"))
      .build()
      .then(this.configureProgram.bind(this));
  }

  private configureProgram(res: WebGLProgram) {
    const gl = this.ctx.getGLContext();

    this.prog = res;
    this.posLoc = gl.getAttribLocation(res, "aPosition");

    this.unifs = {
      uViewmat: gl.getUniformLocation(res, "uViewmat"),
      uPersmat: gl.getUniformLocation(res, "uPersmat"),
      uCubemap: gl.getUniformLocation(res, "uCubemap")
    };
  }

  drawMaterial(model: Model) {
    const gl = this.ctx.getGLContext();
    if (this.prog !== null && this.cube !== null) {
      gl.useProgram(this.prog);
      const strip = mat4.copy(mat4.create(), this.view);
      // equiv to mat4 -> mat3 -> mat4
      strip[3] = 0;
      strip[7] = 0;
      strip[11] = 0;
      strip[12] = 0;
      strip[13] = 0;
      strip[14] = 0;
      strip[15] = 1;
      gl.uniformMatrix4fv(this.unifs.uViewmat, false, strip);
      gl.uniformMatrix4fv(this.unifs.uPersmat, false, this.persp);
      this.cube.bindToUniform(this.unifs.uCubemap, 1);
  
      model.bindAttribute(AttributeType.POSITION, this.posLoc);
      model.draw();
    }
  }
}