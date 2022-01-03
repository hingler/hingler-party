import { ArrayBufferToString } from "../../../../../ts/util/StringToArrayBuffer";
import { GameContext } from "../../GameContext";
import { GLAttributeImpl } from "../../gl/internal/GLAttributeImpl";
import { GLBuffer } from "../../gl/internal/GLBuffer";
import { GLBufferImpl } from "../../gl/internal/GLBufferImpl";
import { GLIndexImpl } from "../../gl/internal/GLIndexImpl";
import { ImageTexture } from "../../gl/internal/ImageTexture";
import { EngineContext } from "../../internal/EngineContext";
import { InstancedModel } from "../../model/InstancedModel";
import { Model } from "../../model/Model";
import { FileLike } from "../FileLike";
import { FileLoader } from "../FileLoader";
import { GLTFLoader } from "../GLTFLoader";
import { GLTFScene } from "../GLTFScene";
import { GLTFSceneImpl } from "./GLTFSceneImpl";
import { GLTFJson } from "./gltfTypes";
import { InstancedModelImpl } from "./InstancedModelImpl";
import { ModelImpl, ModelInstance } from "./ModelImpl";

const GLTF_MAGIC = 0x46546C67;
const CHUNK_TYPE_JSON = 0x4E4F534A;
const CHUNK_TYPE_BIN = 0x004E4942;

enum FileType {
  BINARY,
  UNKNOWN
};

export class GLTFLoaderImpl implements GLTFLoader {
  private loader: FileLoader;
  private gl: WebGLRenderingContext;
  private sceneCache: Map<string, GLTFScene>;
  private scenesLoading: Map<string, Promise<GLTFScene>>;
  private instancedModels: Set<InstancedModelImpl>;
  private ctx: EngineContext;

  constructor(loader: FileLoader, ctx: EngineContext) {
    this.loader = loader;
    this.gl = ctx.getGLContext();
    this.ctx = ctx;
    this.sceneCache = new Map();
    this.scenesLoading = new Map();
    this.instancedModels = new Set();
  }

  getInstancedModels() {
    return this.instancedModels;
  }

  /**
   * Internally stores the passed model, so that the renderer can draw it.
   * @param model - The model being registered.
   * 
   * todo: handling duplicates from multiple scenes? it shouldnt be a problem
   * if we implement scene switching we'll dump loader contents and spin up a new context
   */
  registerInstancedModel(model: InstancedModelImpl) {
    this.instancedModels.add(model);
  }

  resolvePath(path: string) {
    let suffix = path.substring(path.lastIndexOf('.') + 1).toLowerCase();
    switch (suffix) {
      case "glb":
        return FileType.BINARY;
      default:
        console.error("Cannot currently handle file " + path);
        return FileType.UNKNOWN;
    }
  }

  async loadAsGLTFScene(path: string) {
    let type = this.resolvePath(path);
    let res : GLTFScene;
    switch (type) {
      case FileType.BINARY:
        res = await this.glbBinaryToScene(path);
        break;
      case FileType.UNKNOWN:
        return null;
      default:
        console.error("Something went wrong :(");
        throw Error("what");
    }

    return res;
  }

  /**
   * deprecated
   * @param path - path to image 
   * @returns imagetexture object
   */
  async loadTexture(path: string) {
    let tex = new ImageTexture(this.gl, path);
    await tex.waitUntilLoaded();
    return tex;
  }

  async loadGLTFModel(path: string) : Promise<Array<Model>> {
    // start out by just printing the stuff in the json field
    // as well as interpreting the binary data
    // convert to a resolvepath func
    let suffix = path.substring(path.lastIndexOf('.') + 1).toLowerCase();
    switch (suffix) {
      case "glb":
        return this.loadGLB(path);
      default:
        console.error("Cannot currently handle file " + path);
        return null;
    }
  }

  async glbBinaryToScene(path: string) : Promise<GLTFScene> {
    if (this.scenesLoading.has(path)) {
      return await this.scenesLoading.get(path);
    }

    if (this.sceneCache.has(path)) {
      console.log("scene cache hit!");
      return this.sceneCache.get(path);
    }

    let resolve : (a: GLTFScene | PromiseLike<GLTFScene>) => void;
    let reject : (a: any) => void;

    let progress : Promise<GLTFScene> = new Promise((re, rj) => {
      resolve = re;
      reject = rj;
    });

    this.scenesLoading.set(path, progress);

    let file = await this.loader.open(path);
    let buf = file.asArrayBuffer();
    let view = new DataView(buf);

    // do everything up to reading the buffers, then return those
    // let the loading function handle parsing
    
    // read magic
    const magic = view.getUint32(0, true);
    if (magic !== GLTF_MAGIC) {
      let err = `Magic number in file does not match desired!`;
      console.warn(err);
      reject(err);
      this.scenesLoading.delete(path);
      throw Error(err);
    }

    const ver = view.getUint32(4, true);
    if (ver !== 2) {
      let err = `Version number in file is not 2!`;
      console.warn(err);
      reject(err);
      this.scenesLoading.delete(path);
      throw Error(err);
    }

    const len = view.getUint32(8, true);

    // first chunk is always json data, remaining are binary
    const jsonChunkLen = view.getUint32(12, true);
    const jsonChunkType = view.getUint32(16, true);
    if (jsonChunkType !== CHUNK_TYPE_JSON) {
      let err = `First chunk is not JSON!`;
      console.warn(err);
      reject(err);
      this.scenesLoading.delete(path);
      throw Error(err);
    }

    let jsonData = buf.slice(20, 20 + jsonChunkLen);
    let jsonRaw = ArrayBufferToString(jsonData);
    console.debug(jsonRaw);
    let jsonParsed = JSON.parse(jsonRaw) as GLTFJson;

    console.info(jsonParsed);

    let buffers = this.readBinaryDataToBuffers(view, buf, 20 + jsonChunkLen, len);
    let res = new GLTFSceneImpl(this.ctx, jsonParsed, buffers);
    this.sceneCache.set(path, res);
    this.scenesLoading.delete(path);
    resolve(res);
    return res;
  }

  private async loadGLB(path: string) : Promise<Array<Model>> {
    let scene = await this.glbBinaryToScene(path);
    let models : Array<Model> = [];

    for (let i = 0; i < scene.getModelCount(); i++) {
      models.push(scene.getModel(i));
    }

    return models;
  }

  // returns null if the accessor is falsy (undefined, null, etc)
  private createAttributeFromJSON(data: GLTFJson, buffers: Array<GLBuffer>, accessor: number) {
    if (accessor === undefined) {
      return null;
    }

    let ac = data.accessors[accessor];
    let view = data.bufferViews[ac.bufferView];
    let buffer = buffers[view.buffer];
    // convert this over to something which is just raw memory

    // TODO: this whole bunch needs a reorganization
    // the loader should turn files into arrbuffers
    // the scene should bunch arrbuffers into models
    // and a third component should turn those models into GL data

    // for now i'll just test it in browser 😉
    return new GLAttributeImpl(buffer, view, ac);
  }

  // convert this over to array buffers
  private readBinaryDataToBuffers(view: DataView, buffer: ArrayBuffer, initOffset: number, len: number) : Array<GLBuffer> {
    let buffers : Array<GLBuffer> = [];
    let chunkCount = 1;
    let offset = initOffset;
    while (offset < len) {
      let chunkLen = view.getUint32(offset, true);
      offset += 4;

      let chunkType = view.getUint32(offset, true);
      offset += 4;
      if (chunkType !== CHUNK_TYPE_BIN) {
        let err = `Chunk ${chunkCount} did not contain binary data!`;
        console.warn(err);
        throw Error(err);
      }

      buffers.push(new GLBufferImpl(this.ctx, buffer.slice(offset, chunkLen + offset)))
      offset += chunkLen;
    }

    return buffers;
  }
}