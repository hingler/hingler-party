import { mat4, vec3 } from "gl-matrix";
import { mobileCheck } from "../../../../ts/util/MobileCheck";
import { Framebuffer } from "../gl/Framebuffer";
import { ColorFramebuffer } from "../gl/internal/ColorFramebuffer";
import { AmbientLightStruct } from "../gl/struct/AmbientLightStruct";
import { SpotLightStruct } from "../gl/struct/SpotLightStruct";
import { ColorDisplay } from "../material/ColorDisplay";
import { PostProcessingFilter } from "../material/PostProcessingFilter";
import { ShadowDisplay } from "../material/ShadowDisplay";
import { TextureDisplay } from "../material/TextureDisplay";
import { CameraInfo } from "../object/game/Camera";
import { GameCamera } from "../object/game/GameCamera";
import { GameObject } from "../object/game/GameObject";
import { AmbientLightObject } from "../object/game/light/AmbientLightObject";
import { SpotLight } from "../object/game/light/SpotLight";
import { SpotLightObject } from "../object/game/light/SpotLightObject";
import { SkyboxObject } from "../object/game/SkyboxObject";
import { Scene } from "../object/scene/Scene";
import { RenderContext, RenderPass, SkyboxInfo } from "../render/RenderContext";
import { EngineContext } from "./EngineContext";

class SpotLightRenderContext implements RenderContext {
  info: CameraInfo;
  constructor(light: SpotLight) {
    this.info = light.getLightMatrixAsCameraInfo();
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

  // tracks rendered textures
  private renderPasses: Array<TextureDisplay>;
  constructor(ctx: EngineContext, scene: Scene) {
    this.ctx = ctx;
    this.gl = ctx.getGLContext();
    this.scene = scene;
    this.primaryFB = new ColorFramebuffer(ctx, ctx.getScreenDims());
    this.swapFB = new ColorFramebuffer(ctx, ctx.getScreenDims());
  }

  renderScene() {
    if (!this.scene.isInitialized()) {
      console.info("Render skipped due to uninitialized scene...");
      return;
    }
    
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

    const skybox = this.findSkybox(this.scene.getGameObjectRoot());
    let skyboxInfo : SkyboxInfo = null;
    // do not include until completely convolved
    if (skybox !== null && skybox.getCubemapDiffuse() !== null && skybox.getCubemapSpecular() !== null && skybox.getBRDF() !== null) {
      skyboxInfo = {
        irridance: skybox.getCubemapDiffuse(),
        specular: skybox.getCubemapSpecular(),
        brdf: skybox.getBRDF()
      };
    }

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
        return skyboxInfo;
      }
    }

    this.primaryFB.bindFramebuffer(gl.FRAMEBUFFER);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT | gl.STENCIL_BUFFER_BIT);
    let dim = this.ctx.getScreenDims();
    this.gl.viewport(0, 0, dim[0], dim[1]);
    this.scene.getGameObjectRoot().renderChildren(rc);
    for (let model of this.ctx.getGLTFLoader().getInstancedModels()) {
      model.flush(rc);
    }

    // run our post processing passes
    let filters : Array<PostProcessingFilter> = [];
    
    if (cam) {
      filters = cam.getFilters();
    }
    
    gl.disable(gl.CULL_FACE);
    
    let usePrimaryAsSource = true;
    let src : Framebuffer = this.swapFB;
    let dst : Framebuffer = this.primaryFB;
    for (let filter of filters) {
      src = (usePrimaryAsSource ? this.primaryFB : this.swapFB);
      dst = (usePrimaryAsSource ? this.swapFB : this.primaryFB);

      dst.bindFramebuffer(this.gl.FRAMEBUFFER);
      filter.runFilter(src, dst, rc);

      usePrimaryAsSource = !usePrimaryAsSource;
    }

    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
    this.renderPasses.push(new ColorDisplay(this.ctx, dst.getColorTexture()));

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

  private findSkybox(root: GameObject) : SkyboxObject {
    for (let child of root.getChildren()) {
      if (child instanceof SkyboxObject) {
        return child;
      } else {
        const skybox = this.findSkybox(child);
        if (skybox !== null) {
          return skybox;
        }
      }
    }

    return null;
  }
}