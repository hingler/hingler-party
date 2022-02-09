import { Texture } from "./Texture";

/**
 * Wrapper for some GL functionality that aims to reduce state switching.
 */
export interface GLContextI {
  // bind for using a program
  useProgram(prog: WebGLProgram) : void;
  // bind for setting a uniform1i
  uniform1i(loc: WebGLUniformLocation, val: number) : void;
  uniform1f(loc: WebGLUniformLocation, val: number) : void;
  // bind for textures
  bindTexture(tex: WebGLTexture, target: number, loc?: WebGLUniformLocation) : number;
  bindBuffer(targ: number, buf: WebGLBuffer) : void;
  // clears all texture binds
  clearTexBinds() : void;
}