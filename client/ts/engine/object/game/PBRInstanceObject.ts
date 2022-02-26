import { ComponentType } from "../../component/ComponentType";
import { GameContext } from "../../GameContext";
import { InstancedShadowMaterial, SHADOW_MODEL_MAT_INDEX } from "../../material/InstancedShadowMaterial";
import { PBRInstancedMaterial } from "../../material/PBRInstancedMaterial";
import { PBRMaterial } from "../../material/PBRMaterial";
import { InstancedModel } from "../../model/InstancedModel";
import { PBR_MODEL_MAT_INDEX } from "../../model/internal/PBRInstanceImpl";
import { PBRInstance } from "../../model/PBRInstance";
import { RenderContext, RenderPass } from "../../render/RenderContext";
import { GameObject } from "./GameObject";

const PBR_INSTANCE_OBJECT_MODEL_MAT_INDEX = -1;

export class PBRInstanceObject extends GameObject {
  private mat: Array<PBRInstancedMaterial>;

  private static shadowMat: InstancedShadowMaterial = null;
  
  // indices should be here, not elsewhere
  // make them the same too :()

  // todo: merging multiple models into a single instance? ie if loading from software?
  // - accept singular or array
  // - convert to array internally
  // - draw all models :D
  constructor(ctx: GameContext, init: InstancedModel | Array<InstancedModel>, mat: PBRInstancedMaterial | Array<PBRInstancedMaterial>) {
    // flush call is never made if we construct an instanced model from scratch
    super(ctx);

    if (mat instanceof Array) {
      this.mat = Array.from(mat);
    } else {
      this.mat = [ mat ];
    }

    for (let m of this.mat) {
      m.setModelMatrixIndex(PBR_INSTANCE_OBJECT_MODEL_MAT_INDEX);
    }

    const mod = this.addComponent(ComponentType.INSTANCEDMODEL);
    if (init instanceof Array) {
      mod.model = Array.from(init);
    } else {
      mod.model = [ init ];
    }

    PBRInstanceObject.initializeShadowMat(ctx);
  }

  private static initializeShadowMat(ctx: GameContext) {
    if (this.shadowMat === null) {
      // problem: what to do if context changes?
      // solution: create a store for these assets, wipe them on context changes
      // later though not now :-)
      this.shadowMat = new InstancedShadowMaterial(ctx);
      this.shadowMat.setModelMatrixIndex(PBR_INSTANCE_OBJECT_MODEL_MAT_INDEX);
    }
  }

  renderMaterial(rc: RenderContext) {
    const mat = this.getTransformationMatrix();
    const mod = this.getComponent(ComponentType.INSTANCEDMODEL);
    let index = PBR_INSTANCE_OBJECT_MODEL_MAT_INDEX;

    // if the material doesn't match the render pass, rebind it
    if (mod && mod.model && this.mat) {
      for (let i = 0; i < mod.model.length; i++) {
        const m = mod.model[i];
        const material = m.getBoundMaterial();
        const pass = rc.getRenderPass();
        if ((pass === RenderPass.FINAL && material !== this.mat[i]) || (pass === RenderPass.SHADOW && material !== PBRInstanceObject.shadowMat)) {
          m.flush(rc);
          if (pass === RenderPass.SHADOW) {
            m.setInstancedMaterial(PBRInstanceObject.shadowMat);
          } else {
            m.setInstancedMaterial(this.mat[i]);
          }
        }
        
        m.appendInstanceData(index, mat);
        m.drawInstanced();
      }
    } else if (!this.mat) {
      console.warn("no material provided!");
    } else {
      console.warn("instanced modal draw skipped, no model provided")
    }
  }

  /**
   * @returns a new instance representing the same base object.
   */
  copy() {
    return new PBRInstanceObject(this.getContext(), this.getComponent(ComponentType.INSTANCEDMODEL).model, this.mat);
  }
}