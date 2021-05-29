import { Texture } from "../gl/Texture";
import { GameContext } from "../GameContext";
import { TextureDisplay } from "./TextureDisplay";

export class ColorDisplay extends TextureDisplay {
  constructor(ctx: GameContext, texture: Texture) {
    super(ctx, "../glsl/texturexfer/texturexfer.vert", "../glsl/texturexfer/texturexfer.frag", texture);
  }

  prepareUniforms() {
    // basic texture xfer is what we want
  }
}