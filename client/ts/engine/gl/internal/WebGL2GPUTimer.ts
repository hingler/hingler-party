import { EXT_disjoint_timer_query_webgl2, GameContext } from "../../GameContext";

export class WebGL2GPUTimer {
  private gl: WebGL2RenderingContext;
  private ext: EXT_disjoint_timer_query_webgl2;
  private timePoint: number;
  constructor(ctx: GameContext) {
    this.gl = (ctx.getGLContext() as WebGL2RenderingContext);
    this.ext = ctx.getGLExtension("EXT_disjoint_timer_query_webgl2");
    const bits = this.gl.getQuery(this.ext.TIMESTAMP_EXT, this.ext.QUERY_COUNTER_BITS_EXT) as number;
    console.log(bits);
    const bitsElapsed = this.gl.getQuery(this.ext.TIME_ELAPSED_EXT, this.ext.QUERY_COUNTER_BITS_EXT) as number;
    console.log(bitsElapsed);
    if (bits <= 0) {
      // timing will not work :(
      this.ext = null;
    }
  }

  
}