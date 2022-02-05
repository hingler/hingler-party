import { GameContext } from "../GameContext";
import { getEnginePath } from "../internal/getEnginePath";
import { ShadowCastingLight } from "../object/game/light/ShadowCastingLight";
import { SpotLight } from "../object/game/light/SpotLight";
import { TextureDisplay } from "./TextureDisplay";

export class ShadowDisplay extends TextureDisplay {
  // construct from renderer, just display straight?
  // shader is already handled so it should be quick to snag
  near: number;
  far: number;

  locsShadow: {
    near: WebGLUniformLocation,
    far: WebGLUniformLocation
  };

  constructor(ctx: GameContext, light: ShadowCastingLight) {
    super(ctx, getEnginePath("engine/glsl/debug/shadowdebug.vert"), getEnginePath("engine/glsl/debug/shadowdebug.frag"), light.getShadowTexture());
    this.near = light.near;
    this.far = light.far;
    this.locsShadow = null;
  }

  prepareUniforms(prog: WebGLProgram) {
    let gl = this.getContext().getGLContext();
    if (this.locsShadow === null) {
      this.locsShadow = {
        near: gl.getUniformLocation(prog, "near"),
        far: gl.getUniformLocation(prog, "far")
      };
    }

    const wrap = this.getContext().getGL();
    wrap.useProgram(prog);

    gl.uniform1f(this.locsShadow.near, this.near);
    gl.uniform1f(this.locsShadow.far, this.far);
  }
}