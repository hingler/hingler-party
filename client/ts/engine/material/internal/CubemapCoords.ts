import { vec3 } from "gl-matrix";

export interface CubemapCoords {
  center: vec3;
  right: vec3;
  up: vec3;
}