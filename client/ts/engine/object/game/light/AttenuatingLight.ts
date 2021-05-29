import { Light } from "./Light";

/** supports attenuation for lights */
export interface AttenuatingLight extends Light {
  atten_const: number;
  atten_linear: number;
  atten_quad: number;
}