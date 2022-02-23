import { mat4, ReadonlyMat4 } from "gl-matrix";
import { RenderContext, RenderPass } from "../../render/RenderContext";
import { PBRInstance } from "../PBRInstance";

export const PBR_MODEL_MAT_INDEX = -1;

export class PBRInstanceImpl extends PBRInstance {
  private callback : (mat: ReadonlyMat4, rc: RenderContext) => void;
  modelMat : ReadonlyMat4;
  constructor(callback: (mat: ReadonlyMat4, rc: RenderContext) => void) {
    super();
    this.modelMat = mat4.identity(mat4.create());
    this.callback = callback;
  }

  draw(rc: RenderContext) {
    this.callback(this.modelMat, rc);
  }
}