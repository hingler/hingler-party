import { ReadWriteBuffer } from "nekogirl-valhalla/buffer/ReadWriteBuffer";
import { DataType } from "nekogirl-valhalla/model/DataType";
import { GameContext } from "../../GameContext";
import { BufferTarget, DrawMode, GLBuffer } from "./GLBuffer";


let ext : ANGLE_instanced_arrays = undefined;

/**
 * Represents a GL ArrayBuffer.
 * TODO: this is implementing two things in one place.
 *       create a different implementation specifically for element arrays?
 * 
 *       I won't worry about it for now because this class is internal only
 */
export class GLBufferImpl implements GLBuffer {
  private buf: ReadWriteBuffer;
  glBuf: WebGLBuffer;
  ctx: GameContext;
  gl: WebGLRenderingContext;
  target: BufferTarget;

  glBufferSize: number;
  dirty: boolean;

  dataMode: number;

  private defaultMap: Map<number, number[]>;

  // TODO: assign a target on ctor? (array / element array / etc?)
  // we'd have a confusing dependency :( but even then it like won't matter
  // it's just a safeguard for me, so that we have a bit more info instead of just crashing out
  constructor(ctx: GameContext, buffer?: ReadWriteBuffer | ArrayBuffer | number, dataMode?: number) {
    if (buffer instanceof ReadWriteBuffer) {
      this.buf = buffer;
    } else {
      this.buf = new ReadWriteBuffer(buffer);
    }

    this.ctx = ctx;
    this.gl = ctx.getGLContext();
    const gl = this.gl;

    this.glBuf = gl.createBuffer();
    this.target = BufferTarget.UNBOUND;

    this.dirty = true;
    this.glBufferSize = -1;

    if (dataMode === undefined) {
      this.dataMode = gl.STATIC_DRAW;
    } else {
      this.dataMode = dataMode;
    }

    if (!ext && ctx.webglVersion < 2) {
      ext = ctx.getGLExtension("ANGLE_instanced_arrays");
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
    const buf = this.buf.arrayBuffer();
    if (this.dirty && this.glBufferSize < buf.byteLength) {
      gl.bufferData(targ, buf, this.dataMode);
      this.glBufferSize = buf.byteLength;
    } else if (this.dirty) {
      gl.bufferSubData(targ, 0, buf);
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
    
    this.glVertexAttribDivisor(location, divisor);
  }

  setDefaultAttributeValue(location: number, components: number, ...data: number[]) {
    switch (components) {
      case 1:
        this.gl.vertexAttrib1fv(location, data);
        break;
      case 2:
        this.gl.vertexAttrib2fv(location, data);
        break;
      case 3:
        this.gl.vertexAttrib3fv(location, data);
        break;
      case 4:
        this.gl.vertexAttrib4fv(location, data);
        break;
    }
  }

  private glVertexAttribDivisor(loc: number, div: number) {
    if (this.ctx.webglVersion === 2) {
      const gl = this.ctx.getGLContext() as WebGL2RenderingContext;
      gl.vertexAttribDivisor(loc, div);
    } else {
      ext.vertexAttribDivisorANGLE(loc, div);
    }
  }

  private glDrawElementsInstanced(mode: number, count: number, dataType: number, offset: number, primCount: number) {
    if (this.ctx.webglVersion === 2) {
      const gl = this.ctx.getGLContext() as WebGL2RenderingContext;
      gl.drawElementsInstanced(mode, count, dataType, offset, primCount);
    } else {
      ext.drawElementsInstancedANGLE(mode, count, dataType, offset, primCount);
    }
  }

  disableInstancedVertexAttribute(location: number) {
    this.gl.disableVertexAttribArray(location);
    this.glVertexAttribDivisor(location, 0);
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
    this.glDrawElementsInstanced(glMode, count, dataType, offset, primCount);
  }

  getInt8(offset: number) {
    return this.buf.getInt8(offset);
  }

  getUint8(offset: number) {
    return this.buf.getUint8(offset);
  }

  getInt16(offset: number, littleEndian?: boolean) {
    return this.buf.getInt16(offset, littleEndian);
  }

  getUint16(offset: number, littleEndian?: boolean) {
    return this.buf.getUint16(offset, littleEndian);
  }

  getInt32(offset: number, littleEndian?: boolean) {
    return this.buf.getInt32(offset, littleEndian);
  }

  getUint32(offset: number, littleEndian?: boolean) {
    return this.buf.getUint32(offset, littleEndian);
  }
  
  getFloat32(offset: number, littleEndian?: boolean) {
    return this.buf.getFloat32(offset, littleEndian);
  }

  getFloat32Array(offset: number, num: number) {
    return this.buf.getFloat32Array(offset, num);
  }

  setInt8(offset: number, value: number) {
    this.buf.setInt8(offset, value);
  }

  setUint8(offset: number, value: number) {
    this.buf.setUint8(offset, value);
  }

  setInt16(offset: number, value: number, littleEndian?: boolean) {
    this.buf.setInt16(offset, value, littleEndian);
  }

  setUint16(offset: number, value: number, littleEndian?: boolean) {
    this.buf.setUint16(offset, value, littleEndian);
  }

  setInt32(offset: number, value: number, littleEndian?: boolean) {
    this.buf.setInt32(offset, value, littleEndian);
  }

  setUint32(offset: number, value: number, littleEndian?: boolean) {
    this.buf.setUint32(offset, value, littleEndian);
  }

  setFloat32(offset: number, value: number, littleEndian?: boolean) {
    this.buf.setFloat32(offset, value, littleEndian);
  }

  setFloatArray(offset: number, arr: ArrayLike<number>, littleEndian?: boolean) {
    this.buf.setFloatArray(offset, arr, littleEndian);
  }

  getRegionAsUint16Array(offset: number, length: number) {
    return this.buf.getRegionAsUint16Array(offset, length);
  }

  getRegionAsFloat32Array(offset: number, length: number) {
    return this.buf.getRegionAsFloat32Array(offset, length);
  }

  size() {
    return this.buf.size();
  }

  arrayBuffer() {
    return this.buf.arrayBuffer();
  }
  
  copy() : GLBuffer {
    return new GLBufferImpl(this.ctx, this.buf.arrayBuffer(), this.dataMode);
  }
}

// NOTE: Our GLBuffer should handle all commands pertaining to GL state. No other model-related
// class should have any idea that the GL state machine exists, and should work through this buffer exclusively!

// TODO: Work on making that consistent. Eliminate dependencies.
// Then write a stub which we can use elsewhere (factor out into interface and impl)