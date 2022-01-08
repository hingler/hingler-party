import { perf } from "@hingler-party/ts/performance";
import { Future } from "@hingler-party/ts/util/task/Future";
import { FXAAFilter } from "../filter/FXAAFilter";
import { GameContext } from "../GameContext";
import { getEnginePath } from "../internal/getEnginePath";
import { RenderType } from "../internal/performanceanalytics";
import { PBRMaterialImpl } from "../material/PBRMaterialImpl";
import { ShadowNoTextureMaterial } from "../material/ShadowNoTextureMaterial";
import { Model } from "../model/Model";
import { Sphere } from "../model/primitive/Sphere";
import { GameCamera } from "../object/game/GameCamera";
import { GameModel } from "../object/game/GameModel";
import { GameObject } from "../object/game/GameObject";
import { SpotLightObject } from "../object/game/light/SpotLightObject";
import { SkyboxObject } from "../object/game/SkyboxObject";
import { Scene } from "../object/scene/Scene";
import { RenderContext, RenderPass } from "../render/RenderContext";
import { ProceduralMaterial } from "../texture/ProceduralMaterial";

interface ProceduralTextureInterface_ {
  new (ctx: GameContext, ...args: any[]) : ProceduralMaterial;
}

function ProceduralTextureCtorWrap(ctor: ProceduralTextureInterface_, ...args: any[]) {
  return (ctx: GameContext) => {
    console.log(ctor);
    return new ctor(ctx, ...args);
  }
}1

export class GameModelWrapper extends GameModel {
  private mat: PBRMaterialImpl;
  private shadow: ShadowNoTextureMaterial;
  
  constructor(ctx: GameContext, model: Model | Future<Model> | string, mat: PBRMaterialImpl, name?: string) {
    super(ctx, model, name);
    this.mat = mat;
    this.shadow = new ShadowNoTextureMaterial(ctx);
  }

  renderMaterial(rc: RenderContext) {
    const info = rc.getActiveCameraInfo();
    const timer = this.getContext().getGPUTimer();
    const id = timer.startQuery();
    if (rc.getRenderPass() === RenderPass.SHADOW) {
      this.shadow.modelMat = this.getTransformationMatrix();
      this.shadow.shadowMat = info.vpMatrix;
      this.drawModel(rc, this.shadow);
    } else {
      this.mat.modelMat = this.getTransformationMatrix();
      this.mat.vpMat = info.vpMatrix;
      this.mat.cameraPos = info.cameraPosition;
      this.mat.setSkybox(rc.getSkybox());
      this.mat.setSpotLight(rc.getSpotLightInfo());
      this.drawModel(rc, this.mat);
    }
    timer.stopQueryAndLog(id, `Procedural${this.getDebugName()}`, RenderType.FINAL);
  }
}

export class NormOfTheNorth extends GameObject {
  private delta: number;
  constructor(ctx: GameContext) {
    super(ctx);
    this.delta = 0;
  }

  update() {
    this.delta += this.getContext().getDelta();
    this.setRotationEuler(0, this.delta * 24, 0);
  }
}

export class ProceduralTextureTestScene extends Scene {
  // tex probably requires a constructor
  private texCallback: (ctx: GameContext) => ProceduralMaterial;
  constructor(tex: ProceduralTextureInterface_, ...args: any[]) {
    super();
    this.texCallback = ProceduralTextureCtorWrap(tex, ...args);
  }
  
  // accept proceduraltexture as a test
  async initialize(ctx: GameContext): Promise<void> {
    let start = perf.now();
    const tex = this.texCallback(ctx);
    const model = new Sphere(ctx, 32, 32, 2);
    
    const root = this.getGameObjectRoot();
    
    const cam = new GameCamera(ctx);
    cam.setPosition(0, 0, -6);
    cam.lookAt(0, 0, 0);
    
    const norm = new NormOfTheNorth(ctx);
    norm.addChild(cam);
    
    root.addChild(norm);
    
    const light = new SpotLightObject(ctx);
    light.setPosition(-4, 3, -8);
    light.lookAt(0, 0, 0);
    
    cam.setAsActive();
    // gpu wrenches control between calls i think
    // might be impossible to bench :(
    const albedo = await tex.albedo();
    const normal = await tex.normal();
    const arm = await tex.arm();

    const mat = new PBRMaterialImpl(ctx);
    mat.color = albedo;
    mat.normal = normal;
    // todo: integrate ambient
    mat.metalRough = arm;

    mat.colorFactor = tex.albedoFactor();
    mat.metalFactor = tex.metalFactor();
    mat.roughFactor = tex.roughFactor();

    const gamemodel = new GameModelWrapper(ctx, model, mat, "SampleSphere");
    root.addChild(gamemodel);
    gamemodel.setPosition(0, 0, 0);
    

    const skybox = new SkyboxObject(ctx, getEnginePath("engine/res/cannon_2k.hdr"));
    root.addChild(skybox);

    const fxaa = new FXAAFilter(ctx);
    cam.addFilter(fxaa);

    let end = perf.now();
    console.log(`Procedural shader config time: ${(end - start) / 1000} MS`)
  }
}