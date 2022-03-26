import { GameContext } from "../../GameContext";
import { GLTFSampler } from "../../loaders/internal/gltfTypes";
import { SamplingMode, Texture, TextureFormat } from "../Texture";

export class GLTFTexture extends Texture {
  private dims_: [number, number];

  private tex: WebGLTexture;
  private gl: WebGLRenderingContext;
  private ctx: GameContext;
  private img: HTMLImageElement;
  private sampler: GLTFSampler;

  constructor(ctx: GameContext, buf: ArrayBuffer, sampler: GLTFSampler, mime: string) {
    super();
    this.gl = ctx.getGLContext();
    this.ctx = ctx;

    // https://gist.github.com/candycode/f18ae1767b2b0aba568e
    let urlCreator = window.URL || window.webkitURL;
    let url = urlCreator.createObjectURL(new Blob([buf], {type: mime}));
    this.img = new Image();
    this.img.src = url;
    this.sampler = sampler;

    this.tex = null;
    this.img.addEventListener("load", this.loadTexture.bind(this));
  }

  get dims() {
    return this.dims_;
  }

  setSamplingMode(mode: SamplingMode) {
    return this.handleTextureSampling(this.tex, this.ctx, mode);
  }

  getTextureFormat() {
    return TextureFormat.RGBA;
  }

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

  private loadTexture() {
    [this.dims_, this.tex] = Texture.createTextureFromImage(this.ctx, this.img, this.sampler);
  }
}