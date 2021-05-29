import { FileLoader } from "./loaders/FileLoader";
import { GLTFLoader } from "./loaders/GLTFLoader";
import type { Scene } from "./object/scene/Scene";
import { SceneSwap } from "./object/scene/SceneSwap";

/**
 * A Context aims to provide consistent information to all components on the state of execution.
 */
export interface GameContext {
  /**
   * true if the device is detected as a mobile device, false otherwise.
   */
  readonly mobile : boolean;

  /**
   * @returns the delta on the last frame, in seconds.
   */
  getDelta() : number;

  /**
   * @returns a reference to this context's file loader.
   */
  getFileLoader() : FileLoader;

  /**
   * @returns a reference to this context's GLTF loader.
   * TODO: figure out how to organize our file loaders efficiently.
   */
  getGLTFLoader() : GLTFLoader;

  /**
   * @returns the present GL rendering context.
   */
  getGLContext() : WebGLRenderingContext;

  /**
   * @returns the XY size of the window, in pixels
   */
  getScreenDims() : [number, number];

  // circular dependency between gamecontext and scene
  // swap to a scene interface and use that here instead?
  // in cpp i think i was able to forward declare the scene for the interface
  // and then use the actual class in impl

  // import type { ... } works fine i guess!

  /**
   * @param scene - The scene which will be loaded.
   */
  loadNewScene(scene: Scene) : SceneSwap;

  /**
   *  Stores a variable in this context's environment
   *  @param key - the key used to identify the desired environment variable.
   *  @param value - the value associated with key.
   */ 
  setContextVar(key: string, value: any) : void;

  /**
   *  Fetches a variable from this context.
   *  @param key - the key associated with the desired var.
   *  @returns the associated environment var, or null if DNE.
   */ 
  getContextVar(key: string) : any;
  // template this function??
  
  /**
   *  @returns a list of glsl #defines for all environment variables prefixed
   *  with `SHADER_`.
   */ 
  getShaderEnv() : string;
}
