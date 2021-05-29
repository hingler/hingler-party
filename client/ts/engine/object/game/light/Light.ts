import { vec4 } from "gl-matrix";

export interface Light {
  // brightness of a light.
  intensity: number;

  // color of the light.
  color: vec4;
}