import { Task } from "../../../../../ts/util/task/Task";
import { GameContext } from "../../GameContext";
import { SamplingMode, Texture, TextureFormat } from "../Texture";

export class ImageTexture extends Texture {
  private dims_: [number, number];

  private tex: WebGLTexture;
  private gl: WebGLRenderingContext;
  private ctx: GameContext;
  private img: HTMLImageElement;

  private loadTask: Task<void>;

  // todo: create an interface for readonly textures
  // share w other components where necessaryt :D
  constructor(ctx: GameContext, href: string) {
    super();
    this.gl = ctx.getGLContext();
    this.ctx = ctx;
    this.img = new Image();
    this.img.src = href;
    this.tex = null;

    this.loadTask = new Task();

    this.img.addEventListener("load", this.loadTexture.bind(this));
  }

  get dims() {
    return this.dims_;
  }

  // TODO: redundant code
  bindToUniform(location: WebGLUniformLocation, index: number) {
    let gl = this.gl;
    if (index > 31 || index < 0) {
      let err = "Index OOB on GLTF Texture!";
      console.error(err);
    }

    
    if (this.tex !== null) {
      const wrap = this.ctx.getGL();
      wrap.bindTexture(this.tex, gl.TEXTURE_2D, location);
    }
  }

  setSamplingMode(mode: SamplingMode) {
    return this.handleTextureSampling(this.tex, this.ctx, mode);
  }

  getTextureFormat() {
    return TextureFormat.RGBA;
  }

  async waitUntilLoaded() {
    await this.loadTask.getFuture().wait();
  }

  private loadTexture() {
    [this.dims_, this.tex] = Texture.createTextureFromImage(this.ctx, this.img);
    this.loadTask.resolve();
  }
}