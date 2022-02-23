import { mat4 } from "gl-matrix";
import { AttributeType } from "nekogirl-valhalla/model/AttributeType";
import { GameContext } from "../GameContext";
import { GLProgramWrap } from "../gl/internal/GLProgramWrap";
import { ShaderProgramBuilder } from "../gl/ShaderProgramBuilder";
import { getEnginePath } from "../internal/getEnginePath";
import { InstancedModel } from "../model/InstancedModel";
import { RenderContext } from "../render/RenderContext";
import { InstancedMaterial } from "./InstancedMaterial";

export const SHADOW_MODEL_MAT_INDEX = -2;

export class InstancedShadowMaterial implements InstancedMaterial {
  private modelMatIndex: number;
  private ctx: GameContext;
  private prog: WebGLProgram;
  private progWrap: GLProgramWrap;

  shadow_matrix: mat4;
  
  private locs: {
    shadow_matrix: WebGLUniformLocation;
  };

  private attribs: {
    position: number;
    model_matrix: number;
  };

  constructor(ctx: GameContext) {
    this.modelMatIndex = -1;
    this.ctx = ctx;
    this.prog = null;
    this.progWrap = null;

    this.shadow_matrix = mat4.identity(mat4.create());
    // revise engine paths to use "engine"
    new ShaderProgramBuilder(ctx)
      .withVertexShader(getEnginePath("engine/glsl/shadownotexture/shadownotexture_instanced.vert"))
      .withFragmentShader(getEnginePath("engine/glsl/shadownotexture/shadownotexture.frag"))
      .build()
      .then(this.configureProgram.bind(this))
      .catch(console.error.bind(console));
  }

  private configureProgram(prog: WebGLProgram) {
    let gl = this.ctx.getGLContext();
    this.prog = prog;
    this.progWrap = new GLProgramWrap(gl, this.prog); 

    this.locs = {
      shadow_matrix: gl.getUniformLocation(prog, "shadow_matrix")
    };

    this.attribs = {
      position: gl.getAttribLocation(prog, "position"),
      model_matrix: gl.getAttribLocation(prog, "model_matrix")
    }
  }

  setModelMatrixIndex(index: number) { 
    this.modelMatIndex = index;
  }

  prepareAttributes(model: InstancedModel, instances: number, rc: RenderContext) {
    let gl = this.ctx.getGLContext();
    const wrap = this.ctx.getGL();
    if (this.prog === null) {
      const err = "Shadow material not yet compiled -- cannot prepare!";
      throw Error(err);
    }

    if (this.prog !== null) {
      wrap.useProgram(this.prog);

      gl.uniformMatrix4fv(this.locs.shadow_matrix, false, rc.getActiveCameraInfo().vpMatrix);
      model.bindAttribute(AttributeType.POSITION, this.attribs.position);
      for (let i = 0; i < 4; i++) {
        let loc = this.attribs.model_matrix + i;
        let byteOffset = i * 16;
        model.instanceAttribPointer(this.modelMatIndex, loc, 4, gl.FLOAT, false, 64, byteOffset);
      }
    }
  }

  cleanUpAttributes() {
  }
}