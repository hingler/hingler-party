import { mat4, ReadonlyMat4, vec4 } from "gl-matrix";
import { AttributeType } from "nekogirl-valhalla/model/AttributeType";
import { GameContext } from "../GameContext";
import { ShaderProgramBuilder } from "../gl/ShaderProgramBuilder";
import { getEnginePath } from "../internal/getEnginePath";
import { Model } from "../model/Model";
import { Material } from "./Material";

export class FillMaterial implements Material {
  private ctx: GameContext;
  private prog: WebGLProgram;

  private posAttrib: number;
  private colLoc: WebGLUniformLocation;

  private unifs: {
    vpMatrix: WebGLUniformLocation;
    modelMatrix: WebGLUniformLocation;
  }

  col: vec4;
  vpMat: ReadonlyMat4;
  modelMat: ReadonlyMat4;

  constructor(ctx: GameContext) {
    this.ctx = ctx;
    this.prog = null;
    this.col = vec4.zero(vec4.create());

    this.vpMat = mat4.identity(mat4.create());
    this.modelMat = mat4.identity(mat4.create());

    new ShaderProgramBuilder(ctx)
      .withVertexShader(getEnginePath("engine/glsl/fill/fill.vert"))
      .withFragmentShader(getEnginePath("engine/glsl/fill/fill.frag"))
      .build()
      .then(this.configureProgram.bind(this));
  }

  private configureProgram(prog: WebGLProgram) {
    this.prog = prog;
    const gl = this.ctx.getGLContext();

    this.posAttrib = gl.getAttribLocation(prog, "aPosition");
    this.colLoc = gl.getUniformLocation(prog, "col");

    this.unifs = {
      vpMatrix: gl.getUniformLocation(prog, "vpMatrix"),
      modelMatrix: gl.getUniformLocation(prog, "modelMatrix")
    }
  }

  drawMaterial(model: Model) {
    if (this.prog !== null) {
      const gl = this.ctx.getGLContext();
      gl.useProgram(this.prog);
      model.bindAttribute(AttributeType.POSITION, this.posAttrib);
      gl.uniform4fv(this.colLoc, this.col);

      gl.uniformMatrix4fv(this.unifs.vpMatrix, false, this.vpMat);
      gl.uniformMatrix4fv(this.unifs.modelMatrix, false, this.modelMat);
  
      model.draw();
    }
  }
}