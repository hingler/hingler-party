import { GameContext } from "../../GameContext";
import { AttenuatingLight } from "../../object/game/light/AttenuatingLight";
import { GLSLStruct } from "../GLSLStruct";
import { GLProgramWrap } from "../internal/GLProgramWrap";

export class AttenuationStruct implements GLSLStruct {
  readonly atten_const: number;
  readonly atten_linear: number;
  readonly atten_quad: number;
  
  private gl: WebGLRenderingContext;
  constructor(ctx: GameContext, light: AttenuatingLight) {
    this.atten_const = light.atten_const;
    this.atten_linear = light.atten_linear;
    this.atten_quad = light.atten_quad;

    this.gl = ctx.getGLContext();
  }

  bindToUniformByName(prog: GLProgramWrap, name: string) {
    let gl = this.gl;
    const constLoc = prog.getUniformLocation(name + ".atten_const");
    const linearLoc = prog.getUniformLocation(name + ".atten_linear");
    const quadLoc = prog.getUniformLocation(name + ".atten_quad");

    gl.uniform1f(constLoc, this.atten_const);
    gl.uniform1f(linearLoc, this.atten_linear);
    gl.uniform1f(quadLoc, this.atten_quad);
  }
}