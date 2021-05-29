import { GameContext } from "../GameContext";
import { ColorTexture } from "../gl/internal/ColorTexture";
import { Texture } from "../gl/Texture";


// a dummy texture which is used to fill a sampler2D if no texture is desired
let texid : Texture = null;

export class TextureDummy implements Texture {
  readonly dims : [number, number];

  constructor(ctx: GameContext) {
    if (texid === null) {
      texid = new ColorTexture(ctx, [1, 1]);
    }

    this.dims = [1, 1];
  }

  getTextureFormat() {
    return texid.getTextureFormat();
  }

  bindToUniform(location: WebGLUniformLocation, index: number) {
    texid.bindToUniform(location, index);
  }
}