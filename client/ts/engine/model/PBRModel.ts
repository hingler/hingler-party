import { mat4, ReadonlyMat4 } from "gl-matrix";
import { RenderContext } from "../render/RenderContext";
import { Model } from "./Model";

export abstract class PBRModel extends Model {
  /**
   * Like draw(), but uses a PBR shader whose parameters are predetermined.
   * @param modelMatrix - the modelmatrix for the model being drawn.
   * @param rc - the rendercontext for the current frame.
   */
  abstract drawPBR(modelMatrix: ReadonlyMat4, rc: RenderContext) : void;

  /**
   * Like drawPBR, but uses a shadow material for shadow textures :)
   */
  abstract drawPBRShadow(modelMatrix: ReadonlyMat4, rc: RenderContext) : void;
}