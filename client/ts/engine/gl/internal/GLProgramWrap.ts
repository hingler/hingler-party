/**
 * Wrapper for WebGL Programs which attempts to expedite costly procedures
 */
export class GLProgramWrap {
  private uniformCache: Map<string, WebGLUniformLocation>;
  private gl: WebGLRenderingContext;
  prog: WebGLProgram;

  constructor(gl: WebGLRenderingContext, prog: WebGLProgram) {
    this.gl = gl;
    this.prog = prog;
    this.uniformCache = new Map();
  }

  getUniformLocation(name: string) {
    if (this.uniformCache.has(name)) {
      return this.uniformCache.get(name);
    } else {
      let loc = this.gl.getUniformLocation(this.prog, name);
      if (loc !== null) {
        this.uniformCache.set(name, loc);
      }

      return loc;
    }
  }

}