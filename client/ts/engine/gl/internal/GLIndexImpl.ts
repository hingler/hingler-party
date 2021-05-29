import { Accessor, BufferView } from "../../loaders/internal/gltfTypes";
import { GLIndex } from "../GLIndex";
import { BufferTarget, DataType, DrawMode, GLBuffer } from "./GLBuffer";

class IndexIterator implements Iterator<number> {
  accessFunc: (offset: number, littleEndian?: boolean) => number;
  indexWidth: number;
  offset: number;
  count: number;
  index: number;

  constructor(accessFunc: (offset: number, littleEndian?: boolean) => number, indexWidth: number, count: number, offset: number) {
    this.accessFunc = accessFunc;
    this.indexWidth = indexWidth;
    this.offset = offset;
    this.count = count;
    this.index = 0;
  }

  next() {
    if (this.index >= this.count) {
      return {done: true, value: null};
    }

    let ind = this.accessFunc(this.offset, true);
    this.offset += this.indexWidth;
    this.index++;
    return {
      done: (this.count === this.index),
      value: ind
    };
  }
}

export class GLIndexImpl implements GLIndex {
  readonly buffer: GLBuffer;
  readonly offset: number;
  readonly type: number;
  readonly count: number;

  private byteSize: number;

  private accessFunc: (offset: number, littleEndian?: boolean) => number;

  constructor(buffer: GLBuffer, accessor: Accessor, view: BufferView) {
    this.buffer = buffer;
    this.type = accessor.componentType;
    if (accessor.type !== "SCALAR") {
      console.warn("access type mismatch. ignoring :)");
    }

    this.offset = (accessor.byteOffset !== undefined ? accessor.byteOffset : 0) + (view.byteOffset !== undefined ? view.byteOffset : 0);
    this.count = accessor.count;

    // TODO: these are reused, come up with a way to abstract them a bit better
    switch (this.type) {
      case DataType.BYTE:
      case DataType.UNSIGNED_BYTE:
        this.byteSize = 1;
        break;
      case DataType.SHORT:
      case DataType.UNSIGNED_SHORT:
        this.byteSize = 2;
        break;
      case DataType.FLOAT:
      case DataType.UNSIGNED_INT:
        this.byteSize = 4;
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
      case DataType.UNSIGNED_INT:
        this.accessFunc = this.buffer.getInt32.bind(buffer);
        break;
      case DataType.FLOAT:
        this.accessFunc = this.buffer.getFloat32.bind(buffer);
        break;
    }

    console.log("start point: " + this.offset + ", elems: " + this.count + ", width: " + this.byteSize);
  }

  getIndex(offset: number) {
    let byteOffset = this.offset + (this.byteSize * offset);
    return this.accessFunc(byteOffset, true);
  }

  [Symbol.iterator]() : Iterator<number> {
    return new IndexIterator(this.accessFunc, this.byteSize, this.count, this.offset);
  }

  draw() {
    this.buffer.drawElements(this.offset, this.count, this.type, DrawMode.TRIANGLES);
  }

  drawInstanced(count: number) {
    this.buffer.drawElementsInstanced(DrawMode.TRIANGLES, this.count, this.type, this.offset, count);
  }
}
