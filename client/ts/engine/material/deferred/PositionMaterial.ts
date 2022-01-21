import { GameContext } from "../../GameContext";
import { ReadonlyMat4 } from "gl-matrix";
import { Material } from "../Material";
import { ShaderProgramBuilder } from "../../gl/ShaderProgramBuilder";
import { getEnginePath } from "../../internal/getEnginePath";
import { AttributeType, Model } from "../../model/Model";

export class PositionMaterial implements Material {
  private prog: WebGLProgram;

  private ctx: GameContext;

  vpMat: ReadonlyMat4;
  modelMat: ReadonlyMat4;

  private locs: {
    modelMatrix: WebGLUniformLocation,
    vpMatrix: WebGLUniformLocation,

    jointMatrix: Array<WebGLUniformLocation>,
    useSkeletalAnimation: WebGLUniformLocation
  };

  private positionAttribute: number;
  private weightAttribute: number;
  private jointAttribute: number;

  constructor(ctx: GameContext) {
    this.ctx = ctx;
    this.prog = null;
    

    new ShaderProgramBuilder(ctx)
      .withVertexShader(getEnginePath("engine/glsl/position/position.vert"))
      .withFragmentShader(getEnginePath("engine/glsl/position/position.frag"))
      .build()
      .then(this.configureProgram.bind(this));
  }

  private configureProgram(prog: WebGLProgram) {
    const gl = this.ctx.getGLContext();
    this.locs = {
      modelMatrix: gl.getUniformLocation(prog, "modelMatrix"),
      vpMatrix: gl.getUniformLocation(prog, "vpMatrix"),
      jointMatrix: [],
      useSkeletalAnimation: gl.getUniformLocation(prog, "useSkeletalAnimation")
    }

    for (let i = 0; i < 32; i++) {
      this.locs.jointMatrix.push(gl.getUniformLocation(prog, `jointMatrix[${i}]`));
    }

    this.positionAttribute = gl.getAttribLocation(prog, "position");
    this.jointAttribute = gl.getAttribLocation(prog, "joints");
    this.weightAttribute = gl.getAttribLocation(prog, "weights");

    this.prog = prog;
  }

  drawMaterial(model: Model) {
    let gl = this.ctx.getGLContext();
    if (this.prog !== null) {
      gl.useProgram(this.prog);
      gl.uniformMatrix4fv(this.locs.modelMatrix, false, this.modelMat);
      gl.uniformMatrix4fv(this.locs.vpMatrix, false, this.vpMat);

      const arm = model.getArmature();

      model.bindAttribute(AttributeType.POSITION, this.positionAttribute);
      
      if (arm) {
        const bones = model.getArmature().getJointMatrices();
        for (let i = 0; i < bones.length && i < 32; i++) {
          gl.uniformMatrix4fv(this.locs.jointMatrix[i], false, bones[i]);
        }

        model.bindAttribute(AttributeType.JOINT, this.jointAttribute);
        model.bindAttribute(AttributeType.WEIGHT, this.weightAttribute);

        gl.uniform1i(this.locs.useSkeletalAnimation, 1);
      } else {
        gl.uniform1i(this.locs.useSkeletalAnimation, 0);
      }

      model.draw();
    }
  }
}