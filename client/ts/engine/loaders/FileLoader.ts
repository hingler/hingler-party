import { Future } from "../../../../ts/util/task/Future";
import { Task } from "../../../../ts/util/task/Task";
import { ImageTexture } from "../gl/internal/ImageTexture";
import { FileLike } from "./FileLike";
import { FileLikeWeb } from "./internal/FileLikeWeb";

/**
 * Provides a convenient wrapper for loading files.
 * Tracks loading progress of a particular file.
 * Move loading here, instead of GLTFLoader lmao
 */
export class FileLoader {

  private loadedFiles: Map<string, FileLikeWeb>;
  private imageTextures: Map<string, ImageTexture>;
  private workerPath: Promise<void>;
  private res: () => void;
  private rej: (_: any) => void;
  private static workerLoaded: Task<void> = null;

  private gl: WebGLRenderingContext;

  constructor(gl: WebGLRenderingContext, loadServiceWorker?: boolean) {
    this.loadedFiles = new Map();
    this.imageTextures = new Map();
    this.gl = gl;
    FileLoader.workerLoaded = null;
    if (loadServiceWorker === undefined || loadServiceWorker) {
      this.workerPath = new Promise((re, rj) => { this.res = re; this.rej = rj; });;
  
      // serviceworker needs to be a singleton!!!
      
      if ("serviceWorker" in navigator && FileLoader.workerLoaded === null) {
        FileLoader.workerLoaded = new Task();
        this.cb();
      } else {
        // fetch calls won't go to cache, but it's OK
        this.res();
      }
    } else {
      console.debug("ServiceWorker did not load on this run :)");
    }
  }

  private async cb() {
    console.log("test");
    // raise a boolean flag if the serviceworker is registered
    window.navigator.serviceWorker.register("../sw.js", {}).then((_) => {
      console.log("serviceworker registered~~~");
      this.res();
      FileLoader.workerLoaded.resolve();
    }, (err) => {
      console.error("could not register serviceworker :(");
      // for some reason this occurs on the pentium silver
      // not sure what the underlying cause is, i'll look into it
      // either way, make sure this doesn't throw forever
      // supported but crashes
      console.error(err);
      this.res();
    })
  }

  async open(path: string) : Promise<FileLike> {
    await this.workerPath;

    if (FileLoader.workerLoaded !== null) {
      // this should always be false -- wait for the resolution of the workerloaded singleton
      await FileLoader.workerLoaded.getFuture().wait();
    }
    let res : FileLikeWeb;
    
    if (this.loadedFiles.has(path)) {
      res = this.loadedFiles.get(path);
    } else {
      let resp = fetch(path);
      res = new FileLikeWeb(resp);
      this.loadedFiles.set(path, res);
    }

    await res.waitUntilReady();
    return res;
  }

  async openTexture(path: string) {
    let tex: ImageTexture;
    if (this.imageTextures.has(path)) {
      tex = this.imageTextures.get(path);
    } else {
      tex = new ImageTexture(this.gl, path);
      this.imageTextures.set(path, tex);
    }

    await tex.waitUntilLoaded();
    return tex;
  }

  getFractionLoaded() : number {
    let files = 0;
    let filesLoaded = 0;

    if (this.loadedFiles.size === 0) {
      return 1;
    }

    for (let file of this.loadedFiles) {
      files++;
      if (file[1].ready()) {
        filesLoaded++;
      }
    }

    return (filesLoaded / files);
  }
}

// focus on single scene right now -- i'm pretty sure that should be fine.

// rather than transitioning between scenes, we'll use webpages to implement that.
