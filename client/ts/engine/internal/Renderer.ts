import { mat4, vec3 } from "gl-matrix";
import { perf } from "../../../../ts/performance";
import { mobileCheck } from "../../../../ts/util/MobileCheck";
import { PingQueue } from "../../../../ts/util/PingQueue";
import { Framebuffer } from "../gl/Framebuffer";
import { ColorFramebuffer } from "../gl/internal/ColorFramebuffer";
import { AmbientLightStruct } from "../gl/struct/AmbientLightStruct";
import { SpotLightStruct } from "../gl/struct/SpotLightStruct";
import { ColorDisplay } from "../material/ColorDisplay";
import { PostProcessingFilter } from "../material/PostProcessingFilter";
import { ShadowDisplay } from "../material/ShadowDisplay";
import { SkyboxMaterial } from "../material/SkyboxMaterial";
import { TextureDisplay } from "../material/TextureDisplay";
import { Model } from "../model/Model";
import { CameraInfo } from "../object/game/Camera";
import { GameCamera } from "../object/game/GameCamera";
import { GameObject } from "../object/game/GameObject";
import { AmbientLightObject } from "../object/game/light/AmbientLightObject";
import { SpotLight } from "../object/game/light/SpotLight";
import { SpotLightObject } from "../object/game/light/SpotLightObject";
import { SkyboxObject } from "../object/game/SkyboxObject";
import { Scene } from "../object/scene/Scene";
import { RenderContext, RenderPass, SkyboxInfo } from "../render/RenderContext";
import { DebugDisplay } from "./DebugDisplay";
import { EngineContext } from "./EngineContext";

export class RenderPerformanceInfo {
  readonly shadowTime: number;
  readonly finalTime: number;
  readonly postTime: number;
  readonly totalTime: number;
}

class SpotLightRenderContext implements RenderContext {
  info: CameraInfo;
  fb: Framebuffer;
  constructor(light: SpotLight) {
    this.info = light.getLightMatrixAsCameraInfo();
    this.fb = light._getShadowFramebuffer();
  }

  getRenderPass() {
    return RenderPass.SHADOW;
  }

  getActiveCameraInfo() {
    return this.info;
  }

  // something else?
  getSpotLightInfo() {
    return [];
  }

  getAmbientLightInfo() {
    return [];
  }

  getSkybox() {
    return null;
  }

  getFramebuffer() {
    return this.fb;
  }
}

/**
 * Handles rendering of our component hierarchy.
 */
export class Renderer {
  private ctx: EngineContext;
  private gl: WebGLRenderingContext;
  private scene: Scene;
  private primaryFB: Framebuffer;
  private swapFB: Framebuffer;

  private skyboxMat: SkyboxMaterial;
  private cube: Model;

  // time spent rendering shadows
  private shadowRenderTime: number;

  // time spent rendering final image
  private finalRenderTime: number;

  // time spent on post processing
  private postRenderTime: number;

  private totalRenderTime: number;

  // tracks rendered textures
  private renderPasses: Array<TextureDisplay>;
  constructor(ctx: EngineContext, scene: Scene) {
    this.ctx = ctx;
    this.gl = ctx.getGLContext();
    this.scene = scene;
    this.primaryFB = new ColorFramebuffer(ctx, ctx.getScreenDims());
    this.swapFB = new ColorFramebuffer(ctx, ctx.getScreenDims());
    this.skyboxMat = new SkyboxMaterial(ctx);
    this.cube = SkyboxObject.createSkyboxCube(this.ctx);

    this.shadowRenderTime = 0;
    this.finalRenderTime = 0;
    this.postRenderTime = 0;
    this.totalRenderTime = 0;
  }

  renderScene() {
    if (!this.scene.isInitialized()) {
      console.info("Render skipped due to uninitialized scene...");
      return;
    }

    const totalStart = perf.now();
    
    let dims = this.ctx.getScreenDims();
    let old_dims = this.primaryFB.dims;
    if (dims[0] !== old_dims[0] || dims[1] !== old_dims[1]) {
      this.primaryFB.setFramebufferSize(dims);
      this.swapFB.setFramebufferSize(dims);
    }
    
    this.renderPasses = [];
    let gl = this.gl;
    // find lights
    let lights = this.findSpotLights(this.scene.getGameObjectRoot());
    let ambLights = this.findAmbientLights(this.scene.getGameObjectRoot());
    let spotLightInfo : Array<SpotLightStruct> = [];
    let ambLightInfo : Array<AmbientLightStruct> = [];

    gl.enable(gl.CULL_FACE);
    gl.cullFace(gl.FRONT);

    const shadowStart = perf.now();

    for (let light of lights) {
      // skip until spotlights are definitely working
      // skip lights which won't contribute to final image
      if (light.intensity < 0.0001) {
        continue;
      }

      if (this.ctx.mobile) {
        light.setShadows(false);
      } else if (light.getShadowState()) {
        this.renderFromSpotLight(light);
      }
      
      spotLightInfo.push(new SpotLightStruct(this.ctx, light));
    }

    const shadowEnd = perf.now();

    for (let light of ambLights) {
      ambLightInfo.push(new AmbientLightStruct(this.ctx, light));
    }

    gl.cullFace(gl.BACK);

    let cam = this.findActiveCamera(this.scene.getGameObjectRoot());
    let info : CameraInfo;
    if (cam) {
      info = cam.getCameraInfo();
    } else {
      
      let view = mat4.create();
      let persp = mat4.create();
      let vp = mat4.create();
      let pos = vec3.create();
      
      console.info("no active cam found");
      
      mat4.identity(view);
      let rat = this.ctx.getScreenDims();
      mat4.perspective(persp, 1.0826, (rat[0] / rat[1]), 0.01, 100);
      mat4.mul(vp, view, persp);
      vec3.zero(pos);

      info = {
        viewMatrix: view,
        perspectiveMatrix: persp,
        vpMatrix: vp,
        cameraPosition: pos
      };
    }

    const skyboxes = this.findSkybox(this.scene.getGameObjectRoot());
    const skyboxList : Array<SkyboxInfo> = [];
    // do not include until completely convolved
    for (let skybox of skyboxes) {
      if (skybox !== null && skybox.getCubemapDiffuse() !== null && skybox.getCubemapSpecular() !== null && skybox.getBRDF() !== null) {
        skyboxList.push({
          irridance: skybox.getCubemapDiffuse(),
          specular: skybox.getCubemapSpecular(),
          brdf: skybox.getBRDF(),
          intensity: skybox.intensity,
          color: skybox.getCubemap()
        });
      }
    }

    // desc wrt intensity
    skyboxList.sort((a, b) => (b.intensity - a.intensity));

    const fb = this.primaryFB;

    let rc : RenderContext = {
      getRenderPass() {
        return RenderPass.FINAL;
      },

      getActiveCameraInfo() {
        return info;
      },

      getSpotLightInfo() {
        return spotLightInfo;
      },

      getAmbientLightInfo() {
        return ambLightInfo;
      },

      getSkybox() {
        return skyboxList;
      },

      getFramebuffer() {
        return fb;
      }
    }

    const finalStart = perf.now();

    this.primaryFB.bindFramebuffer(gl.FRAMEBUFFER);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT | gl.STENCIL_BUFFER_BIT);
    let dim = this.ctx.getScreenDims();
    this.gl.viewport(0, 0, dim[0], dim[1]);
    this.scene.getGameObjectRoot().renderChildren(rc);
    for (let model of this.ctx.getGLTFLoader().getInstancedModels()) {
      model.flush(rc);
    }

    // draw skybox
    this.gl.disable(gl.CULL_FACE);
    this.skyboxMat.skyboxes = skyboxList;
    this.skyboxMat.persp = info.perspectiveMatrix;
    this.skyboxMat.view = info.viewMatrix;
    this.skyboxMat.drawMaterial(this.cube);

    if (this.ctx.debugger) {
      gl.finish();
    }

    const finalEnd = perf.now();

    // run our post processing passes
    let filters : Array<PostProcessingFilter> = [];

    const postStart = perf.now();
    
    if (cam) {
      filters = cam.getFilters();
    }
    
    let usePrimaryAsSource = true;
    let src : Framebuffer = this.swapFB;
    let dst : Framebuffer = this.primaryFB;
    for (let filter of filters) {
      src = (usePrimaryAsSource ? this.primaryFB : this.swapFB);
      dst = (usePrimaryAsSource ? this.swapFB : this.primaryFB);

      dst.bindFramebuffer(this.gl.FRAMEBUFFER);
      filter.filterfunc(src, dst, rc);

      usePrimaryAsSource = !usePrimaryAsSource;
    }

    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
    this.renderPasses.push(new ColorDisplay(this.ctx, dst.getColorTexture()));

    if (this.ctx.debugger) {
      this.gl.finish();
    }
    const postEnd = perf.now();

    this.shadowRenderTime = shadowEnd - shadowStart;
    this.finalRenderTime = finalEnd - finalStart;
    this.postRenderTime = postEnd - postStart;
    this.totalRenderTime = postEnd - totalStart;
  }

  getDebugTiming() {
    return {
      shadowTime: this.shadowRenderTime,
      finalTime: this.finalRenderTime,
      postTime: this.postRenderTime,
      totalTime: this.totalRenderTime
    } as RenderPerformanceInfo;
  }

  /**
   * Once render is complete, returns the number of passes taken.
   */
  getPassCount() : number {
    return (this.renderPasses ? this.renderPasses.length : 0);
  }

  /**
   * Returns the texture associated with a given pass.
   * Starts from zero and progresses in order drawn.
   * @param index - index fetched.
   * @returns Texture, or null if the index was invalid.
   */
  getPass(index: number) : TextureDisplay {
    return this.renderPasses[Math.min(Math.max(Math.floor(index), 0), this.getPassCount() - 1)];
  } 

  private findSpotLights(root: GameObject) : Array<SpotLightObject> {
    let lights = [];
    if (root instanceof SpotLightObject) {
      lights.push(root);
    }

    for (let child of root.getChildren()) {
      let childLights = this.findSpotLights(child);
      lights.push.apply(lights, childLights);
    }

    return lights;
  }

  private findAmbientLights(root: GameObject) : Array<AmbientLightObject> {
    let lights = [];
    if (root instanceof AmbientLightObject) {
      lights.push(root);
    }

    for (let child of root.getChildren()) {
      let childLights = this.findAmbientLights(child);
      lights.push.apply(lights, childLights);
    }

    return lights;
  }

  private renderFromSpotLight(light: SpotLightObject) {
    let rc : RenderContext = new SpotLightRenderContext(light);
    // provide the fb in context? or rebind it on each pass
    let fb = light._getShadowFramebuffer();
    fb.bindFramebuffer(this.gl.FRAMEBUFFER);
    this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT | this.gl.STENCIL_BUFFER_BIT);
    let dim = fb.dims;
    this.gl.viewport(0, 0, dim[0], dim[1]);
    this.scene.getGameObjectRoot().renderChildren(rc);
    // flush instanced models
    for (let model of this.ctx.getGLTFLoader().getInstancedModels()) {
      model.flush(rc);
    }
    // shadow texture will contain result
    this.renderPasses.push(new ShadowDisplay(this.ctx, light));
  }

  private findActiveCamera(root: GameObject) : GameCamera {
    for (let child of root.getChildren()) {
      if (child instanceof GameCamera && child.isActive()) {
        return child;
      } else {
        let activeCamera = this.findActiveCamera(child);
        if (activeCamera !== null) {
          return activeCamera;
        }
      }
    }

    return null;
  }

  private findSkybox(root: GameObject) : Array<SkyboxObject> {
    let res = [];
    for (let child of root.getChildren()) {
      if (child instanceof SkyboxObject) {
        res.push(child);
      } else {
        const skybox = this.findSkybox(child);
        if (skybox.length !== 0) {
          res = res.concat(skybox);
        }
      }
    }

    return res;
  }
}