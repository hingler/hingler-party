import { GameContext } from "../../GameContext";
import { Model } from "../../model/Model";
import { Material } from "../../material/Material";
import { ShadowNoTextureMaterial } from "../../material/ShadowNoTextureMaterial";
import { RenderContext, RenderPass } from "../../render/RenderContext";
import { GameObject } from "./GameObject";
import { Future } from "../../../../../ts/util/task/Future";
import { ComponentType } from "../../component/ComponentType";
import { IComponentProvider } from "../../component/IComponentProvider";
import { ModelComponent } from "../../component/impl/ModelComponent";

export class GameModel extends GameObject {
  model: Model;
  private shadowTex: ShadowNoTextureMaterial;

  constructor(ctx: GameContext, init: string | Model | Future<Model>, modelName?: string) {
    // pass by path? pass as arg?
    // ctor raw seems like a piss idea
    super(ctx);

    this.addComponent(ComponentType.MODEL);

    this.model = null;
    this.shadowTex = new ShadowNoTextureMaterial(ctx);
    if (typeof init === "string") {
      // TODO: figure out how best to expose our GLTF loader from the engine context.
      this.getContext().getGLTFLoader().loadGLTFModel(init)
        .then((res: Model[]) => {
          if (res.length > 0) {
            this.setModel(res[0]);
          } else {
            console.error("could not assign model!");
          }
        }).catch((reason) => {
          console.error("Something went wrong while parsing model");
          console.error(reason);
        });
      
        this.setDebugName(`${this.getDebugName()}:${init}`);
        
    } else if (init instanceof Model) {
      // TODO: Model is abstract for type inf, roll it back bc future is abstract
      // init instanceof Model
      this.setModel(init);
    } else {
      // init instanceof Future
      if (init.valid()) {
        this.setModel(init.get());
      } else {
        init.wait().then((res: Model) => {
          this.setModel(res);
        });
      }
    }

    if (modelName !== undefined) {
      // preserve file path if provided, add name to end
      this.setDebugName(`${this.getDebugName()}:${modelName}`);
    }
  }

  setModel(model: Model) {
    this.model = model;
    const mod = this.getComponent(ComponentType.MODEL);
    mod.model = this.model;
  }

  // temp in case something is fucky here
  protected getModel() {
    return this.model;
  }

  /**
   * draws this model with `material`. Does not modify material state.
   * @param rc - the render context associated with this draw call.
   * @param material - the material which should be drawn.
   */
  drawModel(rc: RenderContext, material: Material) {
    let info = rc.getActiveCameraInfo();
    if (this.model) {
      // this is a lazy fallback
      if (rc.getRenderPass() === RenderPass.SHADOW) {
        this.shadowTex.modelMat = this.getTransformationMatrix();
        this.shadowTex.shadowMat = info.vpMatrix;
        this.shadowTex.drawMaterial(this.model);
      } else {
        material.drawMaterial(this.model);
      }
    }
  }
}