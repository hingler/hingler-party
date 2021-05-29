import { mat4, vec4, vec3, mat3 } from "gl-matrix";
import { GameContext } from "../GameContext";
import { GLBuffer, GLBufferReadOnly } from "../gl/internal/GLBuffer";
import { GLBufferImpl } from "../gl/internal/GLBufferImpl";
import { GLProgramWrap } from "../gl/internal/GLProgramWrap";
import { ShaderProgramBuilder } from "../gl/ShaderProgramBuilder";
import { SpotLightStruct } from "../gl/struct/SpotLightStruct";
import { Texture } from "../gl/Texture";
import { InstancedModel } from "../model/InstancedModel";
import { AttributeType } from "../model/Model";
import { RenderContext } from "../render/RenderContext";
import { InstancedMaterial } from "./InstancedMaterial";
import { PBRInterface } from "./PBRInterface";
import { TextureDummy } from "./TextureDummy";

// TODO: this is basically copy pasted bc I need a lot of these uniforms again
// come up with a way to factor that reuse out
export interface PBRInstancedMaterial extends InstancedMaterial, PBRInterface {
  
  vpMat: mat4;
  
  color: Texture;
  colorFactor: vec4;
  normal: Texture;
  metalRough: Texture;
  metalFactor: number;
  roughFactor: number;
  emission: Texture;
  emissionFactor: vec4;

  cameraPos: vec3;

  setSpotLight(light: Array<SpotLightStruct>) : void;

  setModelMatrixIndex(index: number) : void;

  prepareAttributes(model: InstancedModel, instances: number, rc: RenderContext) : void;

  cleanUpAttributes() : void;
}