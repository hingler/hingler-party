import { ProceduralTextureBase } from "./ProceduralTextureBase";
import { vec2, ReadonlyVec2, vec4 } from "gl-matrix";
import { GameContext } from "../GameContext";
import { ProceduralMaterial } from "./ProceduralMaterial";
import { ProceduralMaterialBuilderOutput } from "./internal/ProceduralMaterialBuilderOutput";

export class ProceduralMaterialBuilder {
  private albedoMat: ProceduralTextureBase;
  private normalMat: ProceduralTextureBase;
  private armMat:    ProceduralTextureBase;
  private heightMat: ProceduralTextureBase;

  private metalFac: number;
  private roughFac: number;
  private heightScale: number;

  private albedo: vec4;

  private dims: vec2;
  private ctx: GameContext;

  constructor(ctx: GameContext) {
    this.albedoMat = null;
    this.normalMat = null;
    this.armMat = null;
    this.heightMat = null;

    this.metalFac = 1.0;
    this.roughFac = 1.0;
    this.heightScale = 0.005;
    this.albedo = vec4.fromValues(1.0, 1.0, 1.0, 1.0);

    this.dims = null;
    this.ctx = ctx;
  }
  
  withAlbedoMat(mat: ProceduralTextureBase) {
    this.albedoMat = mat;
    return this;
  }

  withNormalMat(mat: ProceduralTextureBase) {
    this.normalMat = mat;
    return this;
  }

  withArmMat(mat: ProceduralTextureBase) {
    this.armMat = mat;
    return this;
  }

  withHeightMat(mat: ProceduralTextureBase) {
    this.heightMat = mat;
    return this;
  }

  withAlbedoFac(fac: vec4) {
    vec4.copy(this.albedo, fac);
    return this;
  }

  withMetalFac(fac: number) {
    this.metalFac = fac;
    return this;
  }

  withRoughFac(fac: number) {
    this.roughFac = fac;
    return this;
  }

  withHeightFac(fac: number) {
    this.heightScale = fac;
    return this;
  }

  withDims(dims: vec2) {
    vec2.copy(this.dims, dims);
  }

  build() : ProceduralMaterial {
    if (this.dims === null) {
      throw Error("Dims for procedural material not specified!");
    }

    if (this.albedoMat) {
      this.albedoMat.setDims(this.dims);
    }

    if (this.normalMat) {
      this.normalMat.setDims(this.dims);
    }

    if (this.normalMat) {
      this.normalMat.setDims(this.dims);
    }

    if (this.heightMat) {
      this.heightMat.setDims(this.dims);
    }

    return new ProceduralMaterialBuilderOutput(this.ctx, this.albedoMat, this.normalMat, this.armMat, this.heightMat, this.metalFac, this.roughFac, this.heightScale, this.albedo, this.dims);
  }
}