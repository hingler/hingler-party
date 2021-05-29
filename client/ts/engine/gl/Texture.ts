import { Sampler } from "../loaders/internal/gltfTypes";

export enum TextureFormat {
  RGBA,
  RGB,
  DEPTH
};

export abstract class Texture {
  // texture dimensions
  abstract readonly dims : [number, number];

  /**
   * Binds this texture to a provided uniform location, at the texture index specified by `index`.
   * @param index - texture index to bind to.
   * @param location - location to bind the texture to.
   */
  abstract bindToUniform(location: WebGLUniformLocation, index: number) : void;
  abstract getTextureFormat() : TextureFormat;

  protected static createTextureFromImage(gl: WebGLRenderingContext, img: HTMLImageElement, sampler?: Sampler) : [[number, number], WebGLTexture] {
    if (!sampler) {
      sampler = {};
    }
    
    let dims : [number, number] = [img.width, img.height];
    let tex : WebGLTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);

    let mag = (sampler.magFilter ? sampler.magFilter : gl.LINEAR);
    let min = (sampler.minFilter ? sampler.minFilter : gl.LINEAR);

    let wrapS = (sampler.wrapS ? sampler.wrapS : gl.REPEAT);
    let wrapT = (sampler.wrapT ? sampler.wrapT : gl.REPEAT);
    // nonstandard: webgl1 doesn't like npot textures w repeat
    // if either is set to repeat

    // if pot: both will be 0, else non 0
    let pot = !(dims[0] & (dims[0] - 1)) && !(dims[1] & (dims[1] - 1));
    if (!pot) {
      console.warn("Encountered non-POT texture!");
    }
    // account for potential mipmap generation
    if ([9984, 9985, 9986, 9987].indexOf(min) !== -1 && pot) {
      // min filter uses mipmaps -- ensure they are generated
      gl.generateMipmap(gl.TEXTURE_2D);
    }

    if (!pot) {
      wrapS = (wrapS === gl.REPEAT ? gl.CLAMP_TO_EDGE : wrapS);
      wrapT = (wrapT === gl.REPEAT ? gl.CLAMP_TO_EDGE : wrapT);
    }

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, mag);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, min);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrapS);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrapT);

    return [dims, tex];
  }


}