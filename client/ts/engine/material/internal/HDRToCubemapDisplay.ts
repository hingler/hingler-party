import { vec3 } from "gl-matrix";
import { GameContext } from "../../GameContext";
import { Texture } from "../../gl/Texture";
import { getEnginePath } from "../../internal/getEnginePath";
import { TextureDisplay } from "../TextureDisplay";
import { CubemapCoords } from "./CubemapCoords";

export class HDRToCubemapDisplay extends TextureDisplay implements CubemapCoords {

  center: vec3;
  right: vec3;
  up: vec3;

  private unifs: {
    center: WebGLUniformLocation,
    right: WebGLUniformLocation,
    up: WebGLUniformLocation
  };

  constructor(ctx: GameContext, hdr: Texture) {
    super(ctx, getEnginePath("engine/glsl/hdr-to-skybox/hdr-to-skybox.vert"), getEnginePath("engine/glsl/hdr-to-skybox/hdr-to-skybox.frag"), hdr);
  }

  protected configureProgram(prog: WebGLProgram) {
    const gl = this.getContext().getGLContext();
    this.unifs = {
      center: gl.getUniformLocation(prog, "center"),
      right: gl.getUniformLocation(prog, "right"),
      up: gl.getUniformLocation(prog, "up")
    };
  }

  protected prepareUniforms() {
    if (this.getShaderFuture().valid()) {
      const gl = this.getContext().getGLContext();
      gl.uniform3fv(this.unifs.center, this.center);
      gl.uniform3fv(this.unifs.right, this.right);
      gl.uniform3fv(this.unifs.up, this.up);
    }
  }
}