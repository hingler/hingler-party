import { GameContext } from "../../GameContext";
import { SamplingMode, Texture, TextureFormat } from "../Texture";
import { BitDepth, ColorTexture } from "./ColorTexture";

export class FloatColorTexture extends ColorTexture {
  constructor(ctx: GameContext, dims: [number, number]) {
    super(ctx, dims, 4, BitDepth.FLOAT);
  }
}