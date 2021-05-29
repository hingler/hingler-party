import { Task } from "../../../../../ts/util/task/Task";
import { Texture, TextureFormat } from "../Texture";

export class ImageTexture extends Texture {
  private dims_: [number, number];

  private tex: WebGLTexture;
  private gl: WebGLRenderingContext;
  private img: HTMLImageElement;

  private loadTask: Task<void>;

  constructor(gl: WebGLRenderingContext, href: string) {
    super();
    this.gl = gl;
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
      gl.activeTexture(gl.TEXTURE0 + index);
      gl.bindTexture(gl.TEXTURE_2D, this.tex);
      gl.uniform1i(location, index);
    }
  }

  getTextureFormat() {
    return TextureFormat.RGBA;
  }

  async waitUntilLoaded() {
    await this.loadTask.getFuture().wait();
  }

  private loadTexture() {
    [this.dims_, this.tex] = Texture.createTextureFromImage(this.gl, this.img);
    this.loadTask.resolve();
  }
}