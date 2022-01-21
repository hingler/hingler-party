import { ReadonlyVec4, vec4 } from "gl-matrix";
import { GameContext } from "../GameContext";
import { Texture } from "../gl/Texture";

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
    return 0.5;
  }

  /**
   * @returns the roughness factor for this material.
   */
  roughFactor() : number {
    return 0.5;
  } 

  heightScale() : number {
    return 0.05;
  }
}