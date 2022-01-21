import { Accessor, BufferView, GLTFAccessorType } from "../../loaders/internal/gltfTypes";
import { GLAttribute } from "../GLAttribute";
import { BufferTarget, DataType, GLBuffer } from "./GLBuffer";

// type informs what information we're returning
// we'll cast to the proper return type when we create one

interface AttributeIterator<U> extends Iterator<U> {
  readFunc: (offset: number, littleEndian?: boolean) => number,
  buffer: GLBuffer,
  offset: number,
  stride: number,
  elem: number,
  comps: number,
  count: number,
  componentSize: number
}

// TODO:
// return float32arrays from everything
// attributes are context dependent, but we can return them
// we can already bind everything, but getting the component count wrong by chance will suck
// so let's let the implementor figure it out :3

// internal implementation of glattribute.
// engine specifies fields before casting to proper attr format and returning
export class GLAttributeImpl implements GLAttribute {
  buffer: GLBuffer;
  readonly comps: number;
  readonly type: number;
  readonly offset: number;
  readonly stride: number;
  readonly count: number;

  private location: number;

  readonly componentByteSize: number;

  private accessFunc: (offset: number, littleEndian?: boolean) => number;
  
  /**
   * Returns a new GLAttributeImpl from attributes, rather than a BufferView and Accessor.
   * @param buffer - the buffer in question
   * @param components - number of components per element
   * @param type - the type of data stored in each component
   * @param offset - offset between components and start of buffer
   * @param stride - stride between individual components.
   */
  static createFromValues(buffer: GLBuffer, components: number, type: number, num: number, offset?: number, stride?: number) {
    let typeString : GLTFAccessorType;
    switch (components) {
      case 1:
        typeString = GLTFAccessorType.SCALAR;
        break;
      case 2:
        typeString = GLTFAccessorType.VEC2;
        break;
      case 3:
        typeString = GLTFAccessorType.VEC3;
        break;
      case 4:
        typeString = GLTFAccessorType.VEC4;
        break;
    };

    let a : Accessor = {
      bufferView: -1,
      componentType: type,
      count: num,
      min: [-1, -1, -1],
      max: [1, 1, 1],
      type: typeString
    };

    let b : BufferView = {
      buffer: -1,
      byteLength: -1,
      byteStride: stride,
      byteOffset: offset
    };

    return new GLAttributeImpl(buffer, b, a);
  }

  constructor(buffer: GLBuffer, view: BufferView, accessor: Accessor) {
    this.buffer = buffer;
    switch (accessor.type) {
      case GLTFAccessorType.SCALAR:
        this.comps = 1;
        break;
      case GLTFAccessorType.VEC2:
      case GLTFAccessorType.VEC3:
      case GLTFAccessorType.VEC4:
        this.comps = Number.parseInt(accessor.type.charAt(3), 10);
        break;
      default:
        let err = `Unknown accessor type: ${accessor.type}`;
        console.warn(err);
        throw Error(err);
    }

    this.type = accessor.componentType;
    this.offset = view.byteOffset + (accessor.byteOffset !== undefined ? accessor.byteOffset : 0);
    this.stride = (view.byteStride !== undefined ? view.byteStride : 0);

    switch (this.type) {
      case DataType.BYTE:
      case DataType.UNSIGNED_BYTE:
        this.componentByteSize = 1;
        break;
      case DataType.SHORT:
      case DataType.UNSIGNED_SHORT:
        this.componentByteSize = 2;
        break;
      case DataType.FLOAT:
        this.componentByteSize = 4;
        break;
      default:
        let err = `Unknown component type: ${this.type}`;
        console.warn(err);
        throw Error(err);

    }

    switch (this.type) {
      case DataType.BYTE:
        this.accessFunc = this.buffer.getInt8.bind(buffer);
        break;
      case DataType.UNSIGNED_BYTE:
        this.accessFunc = this.buffer.getUint8.bind(buffer);
        break;
      case DataType.SHORT:
        this.accessFunc = this.buffer.getInt16.bind(buffer);
        break;
      case DataType.UNSIGNED_SHORT:
        this.accessFunc = this.buffer.getUint16.bind(buffer);
        break;
      case DataType.FLOAT:
        this.accessFunc = this.buffer.getFloat32.bind(buffer);
        break;
    }

    this.count = accessor.count;
    this.location = -1;

  }

  pointToAttribute(location: number) {
    this.location = location;
    this.buffer.bindToVertexAttribute(location, this.comps, this.type, false, this.stride, this.offset);
  }

  setDefaultAttribute(location: number, ...data: number[]) {
    if (data.length >= this.comps) {
      this.buffer.setDefaultAttributeValue(location, this.comps, ...data);
    }
  }

  setDefaultAttributeComps(location: number, comps: number, ...data: number[]) {
    if (data.length >= comps) {
      this.buffer.setDefaultAttributeValue(location, comps, ...data);
    }
  }

  disableAttribute() {
    if (this.location >= 0) {
      this.buffer.disableVertexAttribute(this.location);
      this.location = -1;
    }
  }

  // probably just return number instead of float32array?
  // mantissa is 23bit so we won't lose any info this way
  // ... i probably wont use int attribs because they don't interp and i dont need them >:)
  [Symbol.iterator]() : Iterator<Float32Array> {
    let accessFunc : (offset: number, littleEndian?: boolean) => number = this.accessFunc;

    const iterator : AttributeIterator<Float32Array> = {
      buffer: this.buffer,
      readFunc: accessFunc,
      offset: this.offset,
      stride: this.stride,
      elem: 0,
      comps: this.comps,
      componentSize: this.componentByteSize,
      count: this.count,
      
      next: function() {
        if (this.elem >= this.count) {
          return {done: true, value: null};
        }
        let pos = (this.elem * (this.stride !== 0 ? this.stride : this.componentSize * this.comps)) + this.offset;
        let res : any;
        res = new Float32Array(this.comps);
        for (let i = 0; i < this.comps; i++) {
          // read from wrapper function
          res[i] = this.readFunc(pos + i * this.componentSize, true);
        }

        this.elem++;
        return {done: (this.elem >= this.count), value: res};
      }
    }

    return iterator;
  }

  get(index: number) : Float32Array {
    let pos = index * (this.stride !== 0 ? this.stride : this.componentByteSize * this.comps) + this.offset;
    let res = new Float32Array(this.comps);
    for (let i = 0; i < this.comps; i++) {
      res[i] = this.accessFunc(pos, true);
      pos += this.componentByteSize;
    }

    return res;
  }


}