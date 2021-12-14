import { perf } from "../../../../ts/performance";
import { GameContext } from "../GameContext";
import { Framebuffer } from "../gl/Framebuffer";
import { Texture } from "../gl/Texture";
import { logRender } from "../internal/performanceanalytics";
import { RenderContext } from "../render/RenderContext";
import { screenCoords } from "./TextureDisplay";

/**
 * Represents a filter which is applied to the final image after rendering.
 */
export abstract class PostProcessingFilter {
  // assets required
  // - two framebuffers - one for read, one for write. these should be managed by the engine.
  // - shader for the filter, which will be managed by the implementer
  // - mesh w texcoords to draw to, borrow from screenCoords. we'll manage it in this abstract

  private ctx: GameContext;
  private buf: WebGLBuffer;

  private name: string;

  constructor(ctx: GameContext) {
    this.ctx = ctx;
    let gl = this.ctx.getGLContext();
    this.buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buf);
    gl.bufferData(gl.ARRAY_BUFFER, screenCoords, gl.STATIC_DRAW);

    this.name = this.constructor.name;
  }

  getContext() {
    return this.ctx;
  }

  /**
   * @returns a buffer containing geometry data which covers the screen.
   */
  protected getScreenBuffer() {
    return this.buf;
  }

  filterfunc(src: Framebuffer, dst: Framebuffer, rc: RenderContext) {
    const start = perf.now();
    this.runFilter(src, dst, rc);
    if (this.getContext().debugger) {
      this.getContext().getGLContext().finish();
    }
    
    const end = perf.now();

    logRender(this.name, end - start);
  }

  /**
   * Applies the specified filter to the image in question.
   * @param src - the framebuffer generated from the last pass.
   * @param dst - the framebuffer we intend to draw to.
   */
  abstract runFilter(src: Framebuffer, dst: Framebuffer, rc: RenderContext) : void;
}