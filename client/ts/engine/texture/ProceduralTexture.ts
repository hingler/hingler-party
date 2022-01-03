import { ReadonlyVec4, vec4 } from "gl-matrix";
import { GameContext } from "../GameContext";
import { Texture } from "../gl/Texture";

export abstract class ProceduralTexture {

  /**
   * nop constructor to ensure implementers receive ctx.
   * @param ctx - GameContext.
   */
  constructor(ctx: GameContext) {}

  /**
   * @returns a generated albedo map
   */
  abstract albedo() : Texture;
  
  /**
   * @returns a generated normal map
   */
  abstract normal() : Texture;

  /**
   * @returns a generated arm (albedo:r, roughness:g, metallic:b) texture,
   *          or null if the material does not generate this texture.
   */
  abstract arm() : Texture;

  albedoFactor() : ReadonlyVec4 {
    return vec4.zero(vec4.create());
  }

  /**
   * @returns the metal factor for this material.
   */
  metalFactor() : number {
    return 0.0;
  }

  /**
   * @returns the roughness factor for this material.
   */
  roughFactor() : number {
    return 0.0;
  } 
}