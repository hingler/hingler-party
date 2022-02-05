export class UniformMap {
  // store float and int bindings here
  private bindings1D: Map<WebGLUniformLocation, number>;
  private gl: WebGLRenderingContext;

  constructor(gl: WebGLRenderingContext) {
    this.gl = gl;
    this.bindings1D = new Map();
  }

  uniform1f(location: WebGLUniformLocation, val: number) {
    if (this.bindings1D.get(location) !== val) {
      this.bindings1D.set(location, val);
      this.gl.uniform1f(location, val);
    }
  }

  uniform1i(location: WebGLUniformLocation, val: number) {
    if (this.bindings1D.get(location) !== val) {
      this.bindings1D.set(location, val);
      this.gl.uniform1i(location, val);
    }
  }
}