import { GameContext } from "../../GameContext";
import { Sampler } from "../../loaders/internal/gltfTypes";
import { Texture, TextureFormat } from "../Texture";

export class GLTFTexture extends Texture {
  private dims_: [number, number];

  private tex: WebGLTexture;
  private gl: WebGLRenderingContext;
  private img: HTMLImageElement;
  private sampler: Sampler;

  constructor(gl: WebGLRenderingContext, buf: ArrayBuffer, sampler: Sampler, mime: string) {
    super();
    this.gl = gl;
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
      gl.activeTexture(gl.TEXTURE0 + index);
      gl.bindTexture(gl.TEXTURE_2D, this.tex);
      gl.uniform1i(location, index);
    }
  }

  private loadTexture() {
    [this.dims_, this.tex] = Texture.createTextureFromImage(this.gl, this.img, this.sampler);
  }
}