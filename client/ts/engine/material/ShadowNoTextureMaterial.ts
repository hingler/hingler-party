import { mat4, ReadonlyMat4 } from "gl-matrix";
import { ShaderProgramBuilder } from "../gl/ShaderProgramBuilder";
import { GameContext } from "../GameContext";
import { Model } from "../model/Model";
import { Material } from "./Material";
import { getEnginePath } from "../internal/getEnginePath";
import { AttributeType } from "nekogirl-valhalla/model/AttributeType";

export class ShadowNoTextureMaterial implements Material {
  private prog: WebGLProgram;
  private ctx: GameContext;

  modelMat: ReadonlyMat4;
  shadowMat: ReadonlyMat4;

  private attribs: {
    position: number;
  }

  private locs: {
    model_matrix: WebGLUniformLocation,
    shadow_matrix: WebGLUniformLocation
  };

  constructor(ctx: GameContext) {
    this.ctx = ctx,
    this.prog = null;

    let modelMat = mat4.create();
    let shadowMat = mat4.create();

    mat4.identity(modelMat);
    mat4.identity(shadowMat);

    this.modelMat = modelMat;
    this.shadowMat = shadowMat;

    new ShaderProgramBuilder(ctx)
      .withVertexShader(getEnginePath("engine/glsl/shadownotexture/shadownotexture.vert"))
      .withFragmentShader(getEnginePath("engine/glsl/shadownotexture/shadownotexture.frag"))
      .build()
      .then((prog) => {
        this.prog = prog;
        let gl = this.ctx.getGLContext();

        this.locs = {
          model_matrix: gl.getUniformLocation(prog, "model_matrix"),
          shadow_matrix: gl.getUniformLocation(prog, "shadow_matrix")
        }

        this.attribs = {
          position: gl.getAttribLocation(prog, "position")
        }
      })
      .catch((err) => {
        console.error(err);
      })
  }

  drawMaterial(model: Model) {
    let gl = this.ctx.getGLContext();
    if (this.prog !== null) {
      gl.useProgram(this.prog);
      gl.uniformMatrix4fv(this.locs.model_matrix, false, this.modelMat);
      gl.uniformMatrix4fv(this.locs.shadow_matrix, false, this.shadowMat);
      model.bindAttribute(AttributeType.POSITION, this.attribs.position);

      model.draw();
    }
  }
}