import { ReadonlyMat4 } from "gl-matrix";
import { BufferTarget, DataType, DrawMode, GLBuffer } from "./GLBuffer";


let ext : ANGLE_instanced_arrays = undefined;

/**
 * Represents a GL ArrayBuffer.
 * TODO: this is implementing two things in one place.
 *       create a different implementation specifically for element arrays?
 * 
 *       I won't worry about it for now because this class is internal only
 */
export class GLBufferImpl implements GLBuffer {
  buf: ArrayBuffer;
  glBuf: WebGLBuffer;
  view: DataView;
  gl: WebGLRenderingContext;
  target: BufferTarget;

  glBufferSize: number;
  dirty: boolean;

  dataMode: number;

  // TODO: assign a target on ctor? (array / element array / etc?)
  // we'd have a confusing dependency :( but even then it like won't matter
  // it's just a safeguard for me, so that we have a bit more info instead of just crashing out
  constructor(gl: WebGLRenderingContext, buffer?: ArrayBuffer | number, dataMode?: number) {
    if (typeof buffer === "number") {
      this.buf = new ArrayBuffer(buffer);
    } else if (buffer instanceof ArrayBuffer) {
      this.buf = buffer;
    } else {
      this.buf = new ArrayBuffer(16);
    }

    this.glBuf = gl.createBuffer();
    this.view = new DataView(this.buf);
    this.target = BufferTarget.UNBOUND;
    this.gl = gl;

    this.dirty = true;
    this.glBufferSize = -1;

    if (dataMode === undefined) {
      this.dataMode = gl.STATIC_DRAW;
    } else {
      this.dataMode = dataMode;
    }

    if (!ext) {
      ext = gl.getExtension("ANGLE_instanced_arrays");
    }
  }

  private bindAndPopulate(target: BufferTarget) {
    let gl = this.gl;
    let targ : number;
    switch (target) {
      case BufferTarget.ARRAY_BUFFER:
        targ = gl.ARRAY_BUFFER;
        break;
      case BufferTarget.ELEMENT_ARRAY_BUFFER:
        targ = gl.ELEMENT_ARRAY_BUFFER;
        break;
    }

    gl.bindBuffer(targ, this.glBuf);

    if (this.dirty && this.glBufferSize < this.buf.byteLength) {
      gl.bufferData(targ, this.buf, this.dataMode);
      this.glBufferSize = this.buf.byteLength;
    } else if (this.dirty) {
      gl.bufferSubData(targ, 0, this.buf);
    }

    this.dirty = false;
  }
  
  bindToVertexAttribute(location: number, components: number, type: number, normalize: boolean, stride: number, offset: number) {
    if (this.target === BufferTarget.UNBOUND) {
      this.target = BufferTarget.ARRAY_BUFFER;
    } else if (this.target !== BufferTarget.ARRAY_BUFFER) {
      let err = `WebGL buffers cannot be multi-purpose!`;
      console.warn(err);
      throw Error(err);
    }

    this.bindAndPopulate(BufferTarget.ARRAY_BUFFER);
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.glBuf);
    this.gl.vertexAttribPointer(location, components, type, normalize, stride, offset);
    this.gl.enableVertexAttribArray(location);
  }

  // bind attribute instanced
  // same thing as bindattribute but we want to add an additional step
  // where we specify the divisor in ext
  bindToInstancedVertexAttribute(location: number, components: number, type: number, normalize: boolean, stride: number, offset: number, divisor?: number) {
    if (location < 0) {
      // print stack trace to identify erroneous func call in firefox
      console.error("LOCATION < 0");
    }
    
    if (divisor === undefined) {
      divisor = 1;
    }

    if (this.target === BufferTarget.UNBOUND) {
      this.target = BufferTarget.ARRAY_BUFFER;
    } else if (this.target !== BufferTarget.ARRAY_BUFFER) {
      let err = `WebGL buffers cannot be multi-purpose!`;
      console.warn(err);
      throw Error(err);
    }

    this.bindAndPopulate(BufferTarget.ARRAY_BUFFER);
    this.gl.enableVertexAttribArray(location);
    this.gl.vertexAttribPointer(location, components, type, normalize, stride, offset);
    ext.vertexAttribDivisorANGLE(location, divisor);
  }

  disableInstancedVertexAttribute(location: number) {
    this.gl.disableVertexAttribArray(location);
    ext.vertexAttribDivisorANGLE(location, 0);
  }

  disableVertexAttribute(location: number) {
    this.gl.disableVertexAttribArray(location);
  }

  private handleBindingPoints(mode: DrawMode, dataType: DataType) {
    let gl = this.gl;
    let glMode : number;
    if (mode === undefined) {
      glMode = gl.TRIANGLES;
    } else {
      switch (mode) {
        case DrawMode.TRIANGLES:
          glMode = gl.TRIANGLES;
          break;
        case DrawMode.LINES:
          glMode = gl.LINES;
          break;
        case DrawMode.POINTS:
          glMode = gl.POINTS;
          break;
      }
    }

    let type : number;
    switch (dataType) {
      case DataType.BYTE:
        type = gl.BYTE;
        break;
      case DataType.UNSIGNED_BYTE:
        type = gl.UNSIGNED_BYTE;
        break;
      case DataType.SHORT:
        type = gl.SHORT;
        break;
      case DataType.UNSIGNED_SHORT:
        type = gl.UNSIGNED_SHORT;
        break;
      case DataType.INT:
        type = gl.INT;
        break;
      case DataType.UNSIGNED_INT:
        type = gl.UNSIGNED_INT;
        break;
      default:
        let err = `Unhandled data type: ${dataType}`;
        console.error(err);
        throw Error(err);
    }

    return [glMode, type];
  }

  drawElements(offset: number, count: number, dataType: DataType, mode?: DrawMode) {
    if (this.target === BufferTarget.UNBOUND) {
      this.target = BufferTarget.ELEMENT_ARRAY_BUFFER;
    } else if (this.target !== BufferTarget.ELEMENT_ARRAY_BUFFER) {
      let err = `WebGL buffers cannot be multi-purpose!`;
      console.warn(err);
      throw Error(err);
    }

    this.bindAndPopulate(BufferTarget.ELEMENT_ARRAY_BUFFER);

    let gl = this.gl;
    let [glMode, type] = this.handleBindingPoints(mode, dataType);
    gl.drawElements(glMode, count, type, offset);
  }

  drawElementsInstanced(mode: DrawMode, count: number, type: DataType, offset: number, primCount: number) {
    if (this.target === BufferTarget.UNBOUND) {
      this.target = BufferTarget.ELEMENT_ARRAY_BUFFER;
    } else if (this.target !== BufferTarget.ELEMENT_ARRAY_BUFFER) {
      let err = `WebGL buffers cannot be multi-purpose!`;
      console.warn(err);
      throw Error(err);
    }

    this.bindAndPopulate(BufferTarget.ELEMENT_ARRAY_BUFFER);

    let gl = this.gl;
    let [glMode, dataType] = this.handleBindingPoints(mode, type);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.glBuf);
    ext.drawElementsInstancedANGLE(glMode, count, dataType, offset, primCount);
  }

  getInt8(offset: number) {
    return this.view.getInt8(offset);
  }

  getUint8(offset: number) {
    return this.view.getUint8(offset);
  }

  getInt16(offset: number, littleEndian?: boolean) {
    return this.view.getInt16(offset, littleEndian);
  }

  getUint16(offset: number, littleEndian?: boolean) {
    return this.view.getUint16(offset, littleEndian);
  }

  getInt32(offset: number, littleEndian?: boolean) {
    return this.view.getInt32(offset, littleEndian);
  }

  getUint32(offset: number, littleEndian?: boolean) {
    return this.view.getUint32(offset, littleEndian);
  }
  
  getFloat32(offset: number, littleEndian?: boolean) {
    return this.view.getFloat32(offset, littleEndian);
  }

  getFloat32Array(offset: number, num: number) {
    return new Float32Array(this.buf, offset, num);
  }

  setInt8(offset: number, value: number) {
    this.ensureInBounds(offset);
    this.view.setInt8(offset, value);
  }

  setUint8(offset: number, value: number) {
    this.ensureInBounds(offset);
    this.view.setUint8(offset, value);
  }

  setInt16(offset: number, value: number, littleEndian?: boolean) {
    this.ensureInBounds(offset + 1);
    this.view.setInt16(offset, value, littleEndian);
  }

  setUint16(offset: number, value: number, littleEndian?: boolean) {
    this.ensureInBounds(offset + 1);
    this.view.setUint16(offset, value, littleEndian);
  }

  setInt32(offset: number, value: number, littleEndian?: boolean) {
    this.ensureInBounds(offset + 3);
    this.view.setInt32(offset, value, littleEndian);
  }

  setUint32(offset: number, value: number, littleEndian?: boolean) {
    this.ensureInBounds(offset + 3);
    this.view.setUint32(offset, value, littleEndian);
  }

  setFloat32(offset: number, value: number, littleEndian?: boolean) {
    this.ensureInBounds(offset + 3);
    this.view.setFloat32(offset, value, littleEndian);
  }

  setFloatArray(offset: number, arr: ArrayLike<number>, littleEndian?: boolean) {
    this.ensureInBounds(offset + (4 * arr.length));
    let farr = new Float32Array(this.buf, offset, arr.length);
    farr.set(arr);
  }

  private ensureInBounds(offset: number) {
    const SIZE_MAX = 1073741824;
    this.dirty = true;

    if (this.buf.byteLength <= offset) {
      let bufNew = new ArrayBuffer(Math.min(offset * 2, SIZE_MAX));
      if (offset > SIZE_MAX) {
        throw Error("Too much space reserved for array buffer :sade:");
      }

      new Uint8Array(bufNew).set(new Uint8Array(this.buf), 0);
      this.buf = bufNew;

      this.view = new DataView(this.buf);
    }
  }

  size() {
    return this.buf.byteLength;
  }

  arrayBuffer() {
    return this.buf;
  }
  
  copy() : GLBuffer {
    return new GLBufferImpl(this.gl, this.buf, this.dataMode);
  }
}

// NOTE: Our GLBuffer should handle all commands pertaining to GL state. No other model-related
// class should have any idea that the GL state machine exists, and should work through this buffer exclusively!

// TODO: Work on making that consistent. Eliminate dependencies.
// Then write a stub which we can use elsewhere (factor out into interface and impl)