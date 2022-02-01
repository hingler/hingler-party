import { GameContext } from "../../GameContext";
import { ProceduralMaterial } from "../ProceduralMaterial";
import { ProceduralTextureBase } from "../ProceduralTextureBase";
import { ReadonlyVec4, ReadonlyVec2, vec2 } from "gl-matrix";
import { SamplingMode, WrapMode } from "../../gl/Texture";

export class ProceduralMaterialBuilderOutput extends ProceduralMaterial {
  private dims: ReadonlyVec2;

  private alb: ProceduralTextureBase;
  private norm: ProceduralTextureBase;
  private armMat: ProceduralTextureBase;
  private heightMat: ProceduralTextureBase;

  private metalFac: number;
  private roughFac: number;
  private heightFac: number;
  private albedoFac: ReadonlyVec4;

  private pot: boolean;

  private ctx: GameContext;
  constructor(ctx: GameContext, albedoMat: ProceduralTextureBase, normalMat: ProceduralTextureBase, armMat: ProceduralTextureBase, heightMat: ProceduralTextureBase, metalFactor: number, roughFactor: number, heightScale: number, albedoFactor: ReadonlyVec4, dims: ReadonlyVec2) {
    super(ctx);

    this.alb = albedoMat;
    this.norm = normalMat;
    this.armMat = armMat;
    this.heightMat = heightMat;

    this.dims = vec2.fromValues(dims[0], dims[1]);

    this.pot = !(dims[0] & dims[0] - 1) && !(dims[1] & dims[1] - 1) && (dims[0] === dims[1]);

    this.metalFac = metalFactor;
    this.roughFac = roughFactor;
    this.heightFac = heightScale;
    this.albedoFac = albedoFactor;

    this.ctx = ctx;
  }

  async albedo() {
    return await this.handleTexture(this.alb);
  }

  async normal() {
    return await this.handleTexture(this.norm);
  }

  async arm() {
    return await this.handleTexture(this.armMat);
  }

  async height() {
    return await this.handleTexture(this.heightMat);
  }

  metalFactor() {
    return this.metalFac;
  }

  roughFactor() {
    return this.roughFac;
  }

  heightScale() {
    return this.heightFac;
  }

  private async handleTexture(mat: ProceduralTextureBase) {
    if (mat !== null) {
      await mat.waitUntilCompiled();
      const res = mat.draw();
      if (this.pot) {
        res.setWrapMode(WrapMode.REPEAT);
        res.setSamplingMode(SamplingMode.LINEAR_MIPMAP_LINEAR);
      }

      return res;
    }

    return null;
  }
}