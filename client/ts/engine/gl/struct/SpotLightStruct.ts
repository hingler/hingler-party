import { mat4, vec2, vec3, vec4 } from "gl-matrix";
import { GameContext } from "../../GameContext";
import { SpotLight } from "../../object/game/light/SpotLight";
import { GLSLStruct } from "../GLSLStruct";
import { GLProgramWrap } from "../internal/GLProgramWrap";
import { Texture } from "../Texture";
import { AttenuationStruct } from "./AttenuationStruct";

export class SpotLightStruct implements GLSLStruct {
  readonly position: vec3;
  readonly dir: vec3;
  readonly fov: number;
  readonly falloffRadius: number;
  readonly intensity: number;
  readonly color: vec4;
  readonly shadowTex: Texture;
  readonly lightTransform: mat4;

  readonly attenuation: AttenuationStruct;

  readonly shadowSize: vec2;

  private index: number;

  private gl: WebGLRenderingContext;
  constructor(ctx: GameContext, light: SpotLight) {
    this.position = light.getGlobalPosition();
    this.dir = light.getDirectionVector();
    // convert back to rads for shader :)
    this.fov = light.fov * (Math.PI / 180);
    this.falloffRadius = light.falloffRadius;
    this.intensity = light.intensity;

    // TODO: no idea why this happens :(
    this.color = new Float32Array(light.color);

    if (light.getShadowState()) {
      this.shadowTex = light.getShadowTexture();
    } else {
      this.shadowTex = null;
    }

    this.lightTransform = light.getLightMatrix();

    this.attenuation = new AttenuationStruct(ctx, light);

    this.shadowSize = light.getShadowDims();

    this.index = 0;

    this.gl = ctx.getGLContext();
  }

  hasShadow() {
    return (this.shadowTex !== null);
  }

  // this is fine :)
  // users will set it from render ctx
  // i think thats fine though
  setShadowTextureIndex(index: number) {
    if (index < 0 || index > 31) {
      const err = "Texture index out of bounds!";
      console.error(err);
      throw Error(err);
    }

    this.index = index;
  }

  getShadowTextureIndex() {
    return this.index;
  }

  bindToUniformByName(prog: GLProgramWrap, name: string, enableShadow?: boolean) {
    let gl = this.gl;
    
    // resolves if undefined
    let useShadow = (!!enableShadow) && (this.shadowTex !== null);
    
    const posLoc =        prog.getUniformLocation(name + ".position");
    const dirLoc =        prog.getUniformLocation(name + ".dir");
    const fovLoc =        prog.getUniformLocation(name + ".fov");
    const falloffLoc =    prog.getUniformLocation(name + ".falloffRadius");
    const intensityLoc =  prog.getUniformLocation(name + ".intensity");
    const colorLoc =      prog.getUniformLocation(name + ".color");
    const transformLoc =  prog.getUniformLocation(name + ".lightTransform");
    const shadowDimLoc =  prog.getUniformLocation(name + ".shadowSize");
    let texLoc : WebGLUniformLocation;

    if (useShadow) {
      texLoc =            prog.getUniformLocation("texture_" + name);
    }
    
    this.attenuation.bindToUniformByName(prog, name + ".a");

    gl.uniform3fv(posLoc, this.position);
    gl.uniform3fv(dirLoc, this.dir);
    gl.uniform1f(fovLoc, this.fov);
    gl.uniform1f(falloffLoc, this.falloffRadius);
    gl.uniform1f(intensityLoc, this.intensity);
    gl.uniform4fv(colorLoc, this.color);

    if (useShadow) {
      this.shadowTex.bindToUniform(texLoc, this.index);
    }

    gl.uniformMatrix4fv(transformLoc, false, this.lightTransform);
    gl.uniform2fv(shadowDimLoc, this.shadowSize);
  }
  
}