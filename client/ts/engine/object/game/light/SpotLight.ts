import { mat4, vec3 } from "gl-matrix";
import { Texture } from "../../../gl/Texture";
import { CameraInfo } from "../Camera";
import { AttenuatingLight } from "./AttenuatingLight";
import { ShadowCastingLight } from "./ShadowCastingLight";

export interface SpotLight extends ShadowCastingLight, AttenuatingLight {
  // fov of the spotlight, in degrees.
  fov: number;

  // radius until falloff begins. 0 = no falloff -- 1 = all falloff.
  falloffRadius: number;

  // intensity of the spotlight
  intensity: number;

  atten_const: number;
  atten_linear: number;
  atten_quad: number;
  
  /**
   * @returns the position of this spotlight.
   */
  getGlobalPosition() : vec3;
  
  /**
   * @returns the direction in which this spotlight points.
   */
  getDirectionVector() : vec3;
  
  /**
   * @returns a matrix which transforms world space coordinates into the light's NDC.
   */
  getLightMatrix() : mat4;

  /**
   * Returns light matrix as a camera info.
   */
  getLightMatrixAsCameraInfo() : CameraInfo;

  /**
   * @returns this spotlight's shadow texture.
   */
  getShadowTexture() : Texture;
}