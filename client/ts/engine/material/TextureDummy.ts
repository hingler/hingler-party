import { GameContext } from "../GameContext";
import { ColorTexture } from "../gl/internal/ColorTexture";
import { SamplingMode, Texture } from "../gl/Texture";


// a dummy texture which is used to fill a sampler2D if no texture is desired
let texid : Texture = null;

export class TextureDummy extends Texture {
  readonly dims : [number, number];
  private ctx: GameContext;

  constructor(ctx: GameContext) {
    super();
    this.ctx = ctx;
    if (texid === null) {
      texid = new ColorTexture(ctx, [1, 1]);
    }

    this.dims = [1, 1];
  }

  setSamplingMode(mode: SamplingMode) {
    // ignore sampling sets for our dummy
    return true;
  }

  getTextureFormat() {
    return texid.getTextureFormat();
  }

  bindToUniform(location: WebGLUniformLocation, index: number) {
    texid.bindToUniform(location, index);
  }
}