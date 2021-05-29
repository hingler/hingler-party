import { GameContext } from "../../GameContext";
import { GLTFScene } from "../../loaders/GLTFScene";
import { RenderContext, RenderPass } from "../../render/RenderContext";
import { PBRModel } from "../../model/PBRModel";
import { GameObject } from "./GameObject";
import { Model } from "../../model/Model";
import { Future } from "../../../../../ts/util/task/Future";

export class GamePBRModel extends GameObject {
  model: PBRModel;

  constructor(ctx: GameContext, init: string | PBRModel | Future<PBRModel>) {
    super(ctx);
    this.model = null;
    if (typeof init === "string") {
      this.getContext().getGLTFLoader().loadAsGLTFScene(init)
        .then((res : GLTFScene) => {
          let model = res.getPBRModel(0);
          if (model !== null) {
            this.model = model;
          } else {
            console.error("Could not assign model :(");
          }
        });
    } else if (init instanceof PBRModel) {
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
    if (this.model !== null) {
      let modelMat = this.getTransformationMatrix();
      if (rc.getRenderPass() === RenderPass.SHADOW) {
        this.model.drawPBRShadow(modelMat, rc);
      } else {
        this.model.drawPBR(modelMat, rc);
      }
    }
  }
}