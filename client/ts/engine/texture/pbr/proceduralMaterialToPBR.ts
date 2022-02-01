import { GameContext } from "../../GameContext";
import { PBRInterface } from "../../material/PBRInterface";
import { PBRMaterialImpl } from "../../material/PBRMaterialImpl";
import { ProceduralMaterial } from "../ProceduralMaterial";

/**
 * Creates a new PBR material or applies a procedural material to a provided one.
 * @param ctx - game context
 * @param mat - procedural mat source
 * @param out - output variable -- opt
 * @returns output, or a new PBRMat if not provided.
 */
export async function proceduralMaterialToPBR(ctx: GameContext, mat: ProceduralMaterial, out?: PBRInterface) {
  // we shouldn't create a pbr material...
  // we should create something which creates a pbr material?
  const res = (out ? out : new PBRMaterialImpl(ctx));

  res.color = await mat.albedo();
  res.normal = await mat.normal();
  res.metalRough = await mat.arm();
  res.heightMap = await mat.height();

  res.heightScale = mat.heightScale();
  res.colorFactor = mat.albedoFactor();
  res.metalFactor = mat.metalFactor();
  res.roughFactor = mat.roughFactor();

  return res;
}