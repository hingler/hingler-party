import { ReadonlyVec4, vec4 } from "gl-matrix";
import { GameContext } from "../GameContext";
import { SamplingMode, Texture, WrapMode } from "../gl/Texture";
import { ProceduralTextureBase } from "./ProceduralTextureBase";

export abstract class ProceduralMaterial {

  /**
   * nop constructor to ensure implementers receive ctx.
   * @param ctx - GameContext.
   */
  constructor(ctx: GameContext) {}

  /**
   * @returns a generated albedo map
   */
  abstract albedo() : Promise<Texture>;
  
  /**
   * @returns a generated normal map
   */
  abstract normal() : Promise<Texture>;

  /**
   * @returns a generated arm (albedo:r, roughness:g, metallic:b) texture,
   *          or null if the material does not generate this texture.
   */
  abstract arm() : Promise<Texture>;

  abstract height() : Promise<Texture>;

  albedoFactor() : ReadonlyVec4 {
    return [1, 1, 1, 1];
  }

  /**
   * @returns the metal factor for this material.
   */
  metalFactor() : number {
    return 1.0;
  }

  /**
   * @returns the roughness factor for this material.
   */
  roughFactor() : number {
    return 1.0;
  } 

  heightScale() : number {
    return 0.05;
  }

  protected async drawTex(mat: ProceduralTextureBase, pot: boolean) {
    await mat.waitUntilCompiled();
    const res = mat.draw();
    if (pot) {
      res.setWrapMode(WrapMode.REPEAT);
      res.setSamplingMode(SamplingMode.LINEAR_MIPMAP_LINEAR);
    }

    return res;
  }
}