import { GameContext } from "../../GameContext";
import { GLTFScene } from "../../loaders/GLTFScene";
import { RenderContext, RenderPass } from "../../render/RenderContext";
import { PBRModel } from "../../model/PBRModel";
import { GameObject } from "./GameObject";
import { Model } from "../../model/Model";
import { Future } from "../../../../../ts/util/task/Future";
import { RenderType } from "../../internal/performanceanalytics";

export class GamePBRModel extends GameObject {
  model_: PBRModel;

  constructor(ctx: GameContext, init: PBRModel | Future<PBRModel>) {
    super(ctx);
    this.model_ = null;
    if (init instanceof PBRModel) {
      this.model = init;
    } else {
      if (init.valid()) {
        this.model = init.get();
      } else {
        init.wait().then((res: PBRModel) => {
          this.model = res;
        });
      }
    }
  }

  private updateDebugName() {
    if (this.model_ !== null && this.model_.name !== undefined && this.model_.name.length > 0) {
      this.setDebugName(this.model_.name);
    }
  }

  set model(model: PBRModel) {
    this.model_ = model;
    this.updateDebugName();
  }

  setPBRModel(model: PBRModel | Future<PBRModel>) {
    if (model instanceof PBRModel) {
      this.model = model;
    } else {
      if (model.valid()) {
        console.log(model.get());
        this.model = model.get();
      } else {
        model.wait().then((res: PBRModel) => {
          this.model = res;
        });
      }
    }

    
  }

  renderMaterial(rc: RenderContext) {
    const timer = this.getContext().getGPUTimer();
    const id = timer.startQuery();
    if (this.model_ !== null) {
      
      let modelMat = this.getTransformationMatrix();
      if (rc.getRenderPass() === RenderPass.SHADOW) {
        this.model_.drawPBRShadow(modelMat, rc);
        timer.stopQueryAndLog(id, `${this.getDebugName()}.PBRShadow`, RenderType.SHADOW);
      } else {
        this.model_.drawPBR(modelMat, rc);
        timer.stopQueryAndLog(id, `${this.getDebugName()}.PBRMaterial`, RenderType.FINAL);
      }
    }
  }
}