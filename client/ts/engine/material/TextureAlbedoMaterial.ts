import { mat4, ReadonlyMat4 } from "gl-matrix";
import { ShaderProgramBuilder } from "../gl/ShaderProgramBuilder";
import { Texture } from "../gl/Texture";
import { GameContext } from "../GameContext";
import { AttributeType, Model } from "../model/Model";
import { Material } from "./Material";

export class TextureAlbedoMaterial implements Material {
  private prog: WebGLProgram;
  private ctx: GameContext;
  
  vpMat: ReadonlyMat4;
  modelMat: ReadonlyMat4;
  tex: Texture;

  private locs: {
    modelMat: WebGLUniformLocation;
    vpMat: WebGLUniformLocation;
    tex: WebGLUniformLocation;
  };

  private attribs: {
    pos: number,
    tex: number
  }

  constructor(ctx: GameContext) {
    this.ctx = ctx;
    this.prog = null;

    this.vpMat = mat4.identity(mat4.create());
    this.modelMat = mat4.identity(mat4.create());
    this.tex = null;

    new ShaderProgramBuilder(ctx)
      .withVertexShader("../glsl/debug/texturetest.vert")
      .withFragmentShader("../glsl/debug/texturetest.frag")
      .build()
      .then(this.bindUniforms.bind(this));
  }

  private bindUniforms(prog: WebGLProgram) {
    this.prog = prog;

    let gl = this.ctx.getGLContext();

    this.locs = {
      modelMat: gl.getUniformLocation(prog, "model_matrix"),
      vpMat: gl.getUniformLocation(prog, "vp_matrix"),
      tex: gl.getUniformLocation(prog, "tex")
    };

    this.attribs = {
      pos: gl.getAttribLocation(prog, "position"),
      tex: gl.getAttribLocation(prog, "texcoord")
    };
  }

  drawMaterial(model: Model) {
    let gl = this.ctx.getGLContext();
    if (this.prog !== null) {
      gl.useProgram(this.prog);
      gl.uniformMatrix4fv(this.locs.modelMat, false, this.modelMat);
      gl.uniformMatrix4fv(this.locs.vpMat, false, this.vpMat);
      
      if (this.tex !== null) {
        this.tex.bindToUniform(this.locs.tex, 1);
      }

      model.bindAttribute(AttributeType.POSITION, this.attribs.pos);
      model.bindAttribute(AttributeType.TEXCOORD, this.attribs.tex);

      model.draw();
    }
  }
}