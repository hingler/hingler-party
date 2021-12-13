import { TextureFormat } from "./Texture";

export interface Cubemap {
  // side length of cubemap
  readonly dims: number;

  // binds this cubemap to a uniform
  bindToUniform(location: WebGLUniformLocation, index: number) : void;
  getTextureFormat() : TextureFormat;
}