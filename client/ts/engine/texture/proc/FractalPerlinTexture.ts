import { vec2 } from "gl-matrix";
import { GameContext } from "../../GameContext";
import { getEnginePath } from "../../internal/getEnginePath";
import { ProceduralTextureBase } from "../ProceduralTextureBase";

export class FractalPerlinTexture extends ProceduralTextureBase {
  scale: number;
  octaves: number;

  private scaleLoc: WebGLUniformLocation;
  private octaveLoc: WebGLUniformLocation;

  constructor(ctx: GameContext, dims: vec2) {
    super(ctx, getEnginePath("engine/procedural/fractalperlin.frag"), dims);
  }

  bindUniforms(prog: WebGLProgram) {
    const gl = this.getContext().getGLContext();
    this.scaleLoc = gl.getUniformLocation(prog, "uScale");
    this.octaveLoc = gl.getUniformLocation(prog, "uOctaves");
  }

  assignUniforms() {
    const gl = this.getContext().getGLContext();
    const wrap = this.getContext().getGL();
    const octave = Math.round(Math.max(this.octaves, 2));
    wrap.uniform1i(this.octaveLoc, octave);
    wrap.uniform1f(this.scaleLoc, this.scale);
  }
}