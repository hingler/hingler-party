import { GameContext } from "../GameContext";
import { ColorTexture } from "../gl/internal/ColorTexture";
import { ProceduralTextureBase } from "./ProceduralTextureBase";

export class ProceduralTexture {
  private base: ProceduralTextureBase;
  private tex: ColorTexture;
  constructor(ctx: GameContext, base: ProceduralTextureBase, dims: [number, number]) {

  }
}