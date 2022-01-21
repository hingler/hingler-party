import { GameContext } from "../GameContext";

export interface tex_support {
  renderable: boolean,
  filterable: boolean,
  supported: boolean
};

export class TextureCompatibility {
  static supportFloatTexture(ctx: GameContext) {
    let res  = {} as tex_support;

    res.filterable = !!ctx.getGLExtension("OES_texture_float_linear");

    if (ctx.webglVersion === 2) {
      res.renderable = !!ctx.getGLExtension("EXT_color_buffer_float");
      res.supported = true;
    } else {
      res.renderable = !!ctx.getGLExtension("WEBGL_color_buffer_float");
      res.supported = !!ctx.getGLExtension("OES_texture_float");
    }

    return res;
  }

  // todo: integrate into texture
  // we need float (best) or half float (ok) to do deferred

  static supportHalfFloatTexture(ctx: GameContext) {
    let res = {} as tex_support;

    res.filterable = !!ctx.getGLExtension("OES_texture_half_float_linear");
    
    if (ctx.webglVersion === 2) {
      res.supported = true;
      res.renderable = true;
    } else {
      res.supported = !!ctx.getGLExtension("OES_texture_half_float");
      res.renderable = !!ctx.getGLExtension("EXT_color_buffer_half_float");
    }

    return res;
  }
}