import { mat4, ReadonlyMat4, ReadonlyVec4, vec3, vec4 } from "gl-matrix";
import { SpotLightStruct } from "../gl/struct/SpotLightStruct";
import { Texture } from "../gl/Texture";
import { Model } from "../model/Model";
import { SkyboxInfo } from "../render/RenderContext";
import { Material } from "./Material";
import { PBRInterface } from "./PBRInterface";

// TODO: this is basically copy pasted bc I need a lot of these uniforms again
// come up with a way to factor that reuse out
export interface PBRMaterial extends Material, PBRInterface { 
  
  vpMat: ReadonlyMat4;
  modelMat: ReadonlyMat4;
  
  color: Texture;
  colorFactor: ReadonlyVec4;
  normal: Texture;
  metalRough: Texture;
  metalFactor: number;
  roughFactor: number;
  emission: Texture;
  emissionFactor: vec4;

  cameraPos: vec3;

  setSpotLight(light: Array<SpotLightStruct>) : void;

  setSkybox(skybox: Array<SkyboxInfo>) : void;

  drawMaterial(model: Model) : void;
}