import { ReadonlyVec4, vec4 } from "gl-matrix";
import { Cubemap } from "../gl/Cubemap";
import { Texture } from "../gl/Texture";

export interface PBRInterface {
  color: Texture,
  colorFactor: ReadonlyVec4,
  normal: Texture,

  heightMap: Texture,
  heightScale: number,
  
  metalRough: Texture,
  metalFactor: number,
  roughFactor: number,
  emission: Texture,
  emissionFactor: ReadonlyVec4,
  irridance: Cubemap;
  specular: Cubemap;
  brdf: Texture;
  skyboxIntensity: number;
};