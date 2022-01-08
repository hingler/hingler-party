import { perf } from "../../../../ts/performance";
import { GameCamera } from "../object/game/GameCamera";
import { GameObject } from "../object/game/GameObject";
import { Scene } from "../object/scene/Scene";
import { EXT_disjoint_timer_query_webgl2, GameContext } from "../GameContext";
import { FileLoader } from "../loaders/FileLoader";
import { GLTFLoaderImpl } from "../loaders/internal/GLTFLoaderImpl";
import { Renderer } from "./Renderer";
import { mobileCheck } from "../../../../ts/util/MobileCheck";
import { SceneSwapImpl } from "../object/scene/internal/SceneSwapImpl";
import { ShaderEnv } from "../gl/ShaderEnv";
import { clearPerf } from "./performanceanalytics";
import { DebugDisplay } from "./DebugDisplay";
import { DummyGPUTimer, GPUTimer, GPUTimerInternal, QueryManagerWebGL2, SharedGPUTimer } from "../gl/internal/SharedGPUTimer";

// short list from https://webgl2fundamentals.org/webgl/lessons/webgl1-to-webgl2.html
const WEBGL2_NATIVE_EXTENSIONS = [
  "WEBGL_depth_texture",
  "OES_texture_float",
  "OES_texture_half_float",
  "OES_texture_half_float_linear",
  "OES_vertex_array_object",
  "OES_standard_derivatives",
  "ANGLE_instanced_arrays",
  "OES_element_index_uint",
  "EXT_frag_depth",
  "EXT_blend_minmax",
  "EXT_shader_texture_lod",
  "WEBGL_draw_buffers",
  "OES_fbo_render_mipmap"
];

export interface ContextOptions {
  useServiceWorker?: boolean;
  forceWebGL1?: boolean;
}

/**
 * INTERNAL ONLY.
 */
export class EngineContext implements GameContext {
  private lastTimePoint: number;
  private lastDelta: number;
  private loader: FileLoader;
  private gltfLoader: GLTFLoaderImpl;
  glContext: WebGLRenderingContext | WebGL2RenderingContext;
  canvas: HTMLCanvasElement;
  private scene: Scene;
  private renderer: Renderer;
  private passOffset: number;
  private dims: [number, number];

  private extensionList: Map<string, any>;

  private swapContext : EngineContext;
  private swapObject : SceneSwapImpl;

  private varMap: Map<string, any>;
  private shaderCache: ShaderEnv;
  private windowListener: () => void;

  debugger: boolean;
  webglVersion: number;

  readonly mobile: boolean;

  private debug: DebugDisplay;

  private updateTime: number;

  private gpuTimer: GPUTimerInternal;
  private crappoTimer: GPUTimer;

  private getGLProxy(gl: WebGLRenderingContext | WebGL2RenderingContext) {
    gl = new Proxy(gl, {
      get: function(target, prop, _) {
        let res = target[prop];
        if (typeof res === "function") {
          let func = res as Function;
          return (...args: any) => {
            let res = func.apply(target, args);
            let err = target.getError();
            if (err !== target.NO_ERROR) {
              console.error("Err generated by last gl call to " + prop.toString() + ": " + err);
            }
            return res;
          }
        } else {
          return res;
        }
      }
    });

    return gl;
  } 

  // create a new constructor which allows this scene to borrow assets from
  // the last ctx
  constructor(init: HTMLCanvasElement | EngineContext, scene: Scene, opts?: ContextOptions) {
    this.lastDelta = 0; 
    this.lastTimePoint = perf.now();
    this.varMap = new Map();
    
    this.debugger = true;
    // copy over env???
    // nah we'll standardize its initialization
    this.swapContext = null;
    this.swapObject = null;
    
    this.passOffset = 0;
    
    
    
    this.shaderCache = new ShaderEnv();
    
    
    if (init instanceof EngineContext) {
      this.glContext = init.glContext;
      this.canvas = init.canvas;
      this.webglVersion = init.webglVersion;
      this.extensionList = init.extensionList;
      this.gpuTimer = init.gpuTimer;

      this.loader = new FileLoader(this.glContext, opts ? opts.useServiceWorker : true);
      this.debug = init.debug;
    } else {
      this.canvas = init;
      this.extensionList = new Map();
      if (opts && opts.forceWebGL1) {
        this.setupWebGL1(init);
      } else {
        const gl2 = init.getContext("webgl2");
        if (gl2 && gl2 instanceof WebGL2RenderingContext) {
          this.glContext = gl2;
          this.webglVersion = 2;
          
          const timing = this.getGLExtension("EXT_disjoint_timer_query_webgl2") as EXT_disjoint_timer_query_webgl2;
          if (timing !== null) {
            const mgr = new QueryManagerWebGL2(gl2, timing);
            this.gpuTimer = new SharedGPUTimer(mgr);
          } else {
            // necessary plugins are missing - use this instead
            this.gpuTimer = new DummyGPUTimer();
          }
        } else {
          this.setupWebGL1(init);
        }
      }
      
      console.log(`Using WebGL Version ${this.webglVersion}`);
      this.loader = new FileLoader(this.glContext, opts ? opts.useServiceWorker : true);
      this.debug = new DebugDisplay(this);
    }

    this.crappoTimer = new DummyGPUTimer();
    
    
    this.gltfLoader = new GLTFLoaderImpl(this.loader, this);
    this.updateScreenDims();
    
    this.windowListener = this.updateScreenDims.bind(this);
    // will this event listener stick around forever?
    window.addEventListener("resize", this.windowListener);
    this.mobile = mobileCheck();
   
    // DEBUG LINE!!!
    // this.glContext = this.getGLProxy(this.glContext);
    
    let gl = this.glContext;
    gl.clearColor(0, 0, 0, 1);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.clearDepth(1.0);

    this.scene = scene;
    this.renderer = new Renderer(this, this.scene);
    if (!this.scene.isInitialized()) {
      this.scene.begininit(this);
    }

    addEventListener("keydown", (e: KeyboardEvent) => {
      if (e.code === "PageUp") {
        this.passOffset--;
      } else if (e.code === "PageDown") {
        this.passOffset++;
      } else if (e.code === "Backquote") {
        this.debugger = !this.debugger;
      }
    });

    this.setContextVar("SHADER_WEBGL_VERSION", this.webglVersion, {shaderInteger: true});
  }

  private setupWebGL1(init: HTMLCanvasElement) {
    this.glContext = init.getContext("webgl");
    this.webglVersion = 1;
  }

  private updateScreenDims() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this.dims = [this.canvas.clientWidth, this.canvas.clientHeight];
  }

  getGPUTimer() {
    if (this.debugger) {
      return this.gpuTimer;
    } else {
      return this.crappoTimer;
    }
  }

  // TODO: add method to switch scenes.

  /**
   * @returns the current active scene.
   */
  getScene() : Scene {
    return this.scene;
  }

  getDelta() {
    return this.lastDelta;
  }

  updateDelta() {
    let timept = perf.now();
    this.lastDelta = (timept - this.lastTimePoint) / 1000;
    this.lastTimePoint = timept;
  }

  getFileLoader() {
    return this.loader;
  }

  getGLTFLoader() {
    return this.gltfLoader;
  }

  getGLExtension<T>(name: string) {
    if (this.extensionList.has(name)) {
      const res = this.extensionList.get(name) as T;
      return res;
    }

    if (this.webglVersion === 2 && WEBGL2_NATIVE_EXTENSIONS.indexOf(name) !== -1) {
      // native support -- return a placeholder
      // TODO: bundle in something to indicate that the extension is native
      return {} as T;
    }

    const ext = this.glContext.getExtension(name);
    if (ext !== null) {
      this.extensionList.set(name, ext);
      console.log("loaded extension " + name);
      console.log(ext);
      return ext as T;
    }

    return null;
  }

  getGLContext() {
    return this.glContext;
  }

  getScreenDims() {
    // testing: https://docs.cypress.io/api/commands/viewport#Syntax
    // note: this is slow, cache once a frame instead
    return this.dims;
  }

  loadNewScene(scene: Scene) {
    // create a new context with this ctx and our passed scene as its initial arg
    let newContext = new EngineContext(this, scene);
    let swap = new SceneSwapImpl(newContext, scene);

    this.swapContext = newContext;
    this.swapObject = swap;
    // note: we might want to borrow shit from another scene ig
    return swap;
  }

  setContextVar(key: string, value: any, opts?: { shaderInteger: boolean }) {
    const SHADER_VAR_PREFIX = "SHADER_";
    const ind = key.indexOf(SHADER_VAR_PREFIX);
    if (ind !== -1) {
      this.shaderCache.setShaderVar(key.substring(ind + SHADER_VAR_PREFIX.length), value, (opts ? !!opts.shaderInteger : false));
    }

    this.varMap.set(key, value);
  }

  getContextVar(key: string) {
    return this.varMap.get(key);
  }

  getShaderEnv() {
    return this.shaderCache.getShaderEnv();
  }

  private glSetup() {
    let gl = this.glContext;
    gl.clearColor(0, 0, 0, 1);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
  }

  // we should kickstart the engine, and then forget this object
  async deployContext() {
    // perform our gl setup here
    this.glSetup();
    await this.step();
    requestAnimationFrame(this.computeFrame.bind(this));
  }

  private async computeFrame() {
    this.drawFrame();
    // put swap code here
    if (this.swapObject !== null && this.swapObject.canSwap()) {
      // update delta before deploying, so we don't get a long frame time since init
      this.swapContext.updateDelta();
      requestAnimationFrame(this.swapContext.deployContext.bind(this.swapContext));
    } else {
      await this.step();
      requestAnimationFrame(this.computeFrame.bind(this));
    }
  }

  async step() {
    clearPerf();
    this.updateDelta();
    if (this.scene && this.scene.isInitialized()) {
      const updateStart = perf.now();
      this.scene.getGameObjectRoot().updateChildren();
      const updateEnd = perf.now();
      this.updateTime = updateEnd - updateStart;
      await this.renderer.renderScene();
      this.debug.updateTime = this.updateTime;
    }
    

    this.gpuTimer.invalidateAll();
    
    const renderTiming = this.renderer.getDebugTiming();
    this.debug.shadowTime = renderTiming.shadowTime;
    this.debug.finalTime = renderTiming.finalTime;
    this.debug.postTime = renderTiming.postTime;
    this.debug.totalTime = renderTiming.totalTime;
    
    this.debug.update();

  }

  drawFrame() {
    if (this.scene && this.scene.isInitialized()) {
      let passCount = this.renderer.getPassCount();
      if (passCount > 0) {
        let disp = this.renderer.getPass(Math.abs(this.renderer.getPassCount() - 1));
        this.glContext.bindFramebuffer(this.glContext.FRAMEBUFFER, null);
        this.glContext.clear(this.glContext.COLOR_BUFFER_BIT | this.glContext.DEPTH_BUFFER_BIT);
        disp.drawTexture();
      }
    }
  }

  private findActiveCamera(root: GameObject) : GameCamera {
    for (let child of root.getChildren()) {
      if (child instanceof GameCamera) {
        if (child.isActive()) {
          return child;
        } else {
          this.findActiveCamera(child);
        }
      }
    }
  }
}
