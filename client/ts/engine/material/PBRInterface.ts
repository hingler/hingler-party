import { vec4 } from "gl-matrix";
import { Cubemap } from "../gl/Cubemap";
import { Texture } from "../gl/Texture";

export interface PBRInterface {
  color: Texture,
  colorFactor: vec4,
  normal: Texture,
  metalRough: Texture,
  metalFactor: number,
  roughFactor: number,
  emission: Texture,
  emissionFactor: vec4,
  irridance: Cubemap;
  specular: Cubemap;
  brdf: Texture;
  skyboxIntensity: number;
};