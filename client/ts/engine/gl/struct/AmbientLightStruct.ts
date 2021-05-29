import { vec4 } from "gl-matrix";
import { GameContext } from "../../GameContext";
import { AmbientLightObject } from "../../object/game/light/AmbientLightObject";
import { GLSLStruct } from "../GLSLStruct";
import { GLProgramWrap } from "../internal/GLProgramWrap";

export class AmbientLightStruct implements GLSLStruct {
  readonly color: vec4;
  readonly intensity: number;

  private ctx: GameContext;

  constructor(ctx: GameContext, light: AmbientLightObject) {
    this.color = light.color;
    this.intensity = light.intensity;
    this.ctx = ctx; 
  }

  bindToUniformByName(prog: GLProgramWrap, name: string) {
    const colLoc = prog.getUniformLocation(name + ".color");
    const intLoc = prog.getUniformLocation(name + ".intensity");
    
    let gl = this.ctx.getGLContext();
    gl.uniform4fv(colLoc, this.color);
    gl.uniform1f(intLoc, this.intensity);
  }
}