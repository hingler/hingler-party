import { Texture } from "../gl/Texture";
import { GameContext } from "../GameContext";
import { TextureDisplay } from "./TextureDisplay";
import { getEnginePath } from "../internal/getEnginePath";

export class ColorDisplay extends TextureDisplay {
  constructor(ctx: GameContext, texture: Texture) {
    super(ctx, getEnginePath("engine/glsl/texturexfer/texturexfer.vert"), getEnginePath("engine/glsl/texturexfer/texturexfer.frag"), texture);
  }

  prepareUniforms() {
    // basic texture xfer is what we want
  }
}