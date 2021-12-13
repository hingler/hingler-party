// expose functions to draw it
// and expose functions to set instance state

import { mat4, ReadonlyMat4 } from "gl-matrix";
import { GameContext } from "../GameContext";
import { InstancedModelImpl } from "../loaders/internal/InstancedModelImpl";
import { InstancedShadowMaterial } from "../material/InstancedShadowMaterial";
import { PBRInstancedMaterial } from "../material/PBRInstancedMaterial";
import { RenderContext, RenderPass } from "../render/RenderContext";
import { InstancedModelFactory } from "./InstancedModelFactory";
import { PBRInstanceImpl, PBR_MODEL_MAT_INDEX } from "./internal/PBRInstanceImpl";
import { PBRInstance } from "./PBRInstance";

// factor out into impl and interface :(
export class PBRInstanceFactory implements InstancedModelFactory<PBRInstance> {
  private ctx: GameContext;
  private models: Array<InstancedModelImpl>;
  private materials: Array<PBRInstancedMaterial>;
  private shadowMat: InstancedShadowMaterial;
  private currentPass: RenderPass;

  constructor(ctx: GameContext, models: Array<InstancedModelImpl>, mats: Array<PBRInstancedMaterial>) {
    this.ctx = ctx;
    this.models = models;
    this.materials = mats;
    this.currentPass = RenderPass.FINAL;

    this.shadowMat = new InstancedShadowMaterial(this.ctx);

    for (let i = 0; i < this.models.length; i++) {
      this.models[i].setInstancedMaterial(this.materials[i]);
      this.materials[i].setModelMatrixIndex(PBR_MODEL_MAT_INDEX);
    }

    this.shadowMat.setModelMatrixIndex(PBR_MODEL_MAT_INDEX);
  }

  getInstance() {
    let inst = new PBRInstanceImpl(this.callbackfunc.bind(this));
    return inst;
  }

  /**
   * Draws several instances from an array representing a model matrix.
   * @param matList - array-like structure containing our matrices
   */
  drawInstanceFromModelMatArray(matList: Array<number> | Float32Array, rc: RenderContext) {
    const instanceCount = Math.floor(matList.length / 16);
    let mat = matList;
    // array does not contain exact amt of instance data

    if (instanceCount * 16 !== matList.length) {
      mat = matList.slice(0, instanceCount * 16);
    }

    const pass = rc.getRenderPass();
    if (this.currentPass !== pass) {
      this.currentPass = pass;
      for (let i = 0; i < this.models.length; i++) {
        let model = this.models[i];
        // issue: imagine that we were to draw to the FB, not flush, then draw to shadow
        model.flush(rc);
        if (pass === RenderPass.SHADOW) {
          model.setInstancedMaterial(this.shadowMat);
        } else {
          model.setInstancedMaterial(this.materials[i]);
        }
      }
    }

    for (let i = 0; i < this.models.length; i++) {
      // also calculate normal matrices, or skip?
      this.models[i].appendInstanceData(PBR_MODEL_MAT_INDEX, mat);
      this.models[i].drawManyInstanced(instanceCount);
    }
  }

  private callbackfunc(mat: ReadonlyMat4, rc: RenderContext) {
    let pass = rc.getRenderPass();
    if (this.currentPass !== pass) {
      this.currentPass = pass;
      for (let i = 0; i < this.models.length; i++) {
        let model = this.models[i];
        // issue: imagine that we were to draw to the FB, not flush, then draw to shadow
        model.flush(rc);
        if (pass === RenderPass.SHADOW) {
          model.setInstancedMaterial(this.shadowMat);
        } else {
          model.setInstancedMaterial(this.materials[i]);
        }
      }
    }

    for (let i = 0; i < this.models.length; i++) {
      // need some sort of "batchedinstancemodel" which queues several draws at once

      this.models[i].appendInstanceData(PBR_MODEL_MAT_INDEX, mat);
      this.models[i].drawInstanced();
    }
  }
}