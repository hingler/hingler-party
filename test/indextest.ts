import { expect } from "chai";
import { Accessor, BufferView, GLTFAccessorType } from "../client/ts/engine/loaders/internal/gltfTypes";
import { DataType, DrawMode, GLBuffer } from "../client/ts/engine/gl/internal/GLBuffer";
import { GLIndexImpl } from "../client/ts/engine/gl/internal/GLIndexImpl";

interface IndexRecord {
  offset: number,
  count: number,
  dataType: DataType,
  mode: DrawMode
}

class BufferStub implements GLBuffer {
  private index: IndexRecord;
  private data: ArrayBuffer;
  private view: DataView;
  private elems: number;

  constructor(data: ArrayBuffer) {
    this.index = null;
    this.data = data;
    this.view = new DataView(this.data);
    this.elems = 0;
  }

  size() {
    return this.data.byteLength;
  }

  bindToInstancedVertexAttribute(..._: any) {
    // nop
  }

  setDefaultAttributeValue(location: number, components: number, ...data: number[]): void {
    // nop
  }

  // unused
  copy() {
    return null;
  }

  arrayBuffer() {
    return this.data;
  }

  bindToVertexAttribute(location: number, components: number, type: number, normalize: boolean, stride: number, offset: number) : void {
    // probably record where we bound it and then work with it
    if (this.elems === 2) {
      throw Error("!!!");
    }

    this.elems = 1;
  }

  disableVertexAttribute() {
    // nop
  }

  disableInstancedVertexAttribute(location: number) {
    // nop
  }

  drawElements(offset: number, count: number, dataType: DataType, mode?: DrawMode) : void {
    if (this.elems === 1) {
      throw Error("!!!");
    }

    this.elems = 2;

    this.index = {
      "offset": offset,
      "count": count,
      "dataType": dataType,
      "mode": mode
    };
  }

  getIndices() : Array<number> {
    if (this.index === null) {
      return [];
    } else {
      let accessFunc : (offset: number, littleEndian?: boolean) => number;
      let attributeWidth : number;
      switch (this.index.dataType) {
        case DataType.BYTE:
          accessFunc = this.getInt8.bind(this);
          attributeWidth = 1;
          break;
        case DataType.UNSIGNED_BYTE:
          accessFunc = this.getUint8.bind(this);
          attributeWidth = 1;
          break;
        case DataType.SHORT:
          accessFunc = this.getInt16.bind(this);
          attributeWidth = 2;
          break;
        case DataType.UNSIGNED_SHORT:
          accessFunc = this.getUint16.bind(this);
          attributeWidth = 2;
          break;
        case DataType.FLOAT:
          accessFunc = this.getFloat32.bind(this);
          attributeWidth = 4;
      }

      let res : Array<number> = [];
      for (let i = 0; i < this.index.count; i++) {
        res.push(accessFunc(this.index.offset + attributeWidth * i, true));
      }

      return res;
    }
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

  setInt8(offset: number, value: number) {
    this.view.setInt8(offset, value);
  }

  setUint8(offset: number, value: number) {
    this.view.setUint8(offset, value);
  }

  setInt16(offset: number, value: number, littleEndian?: boolean) {
    this.view.setInt16(offset, value, littleEndian);
  }

  setUint16(offset: number, value: number, littleEndian?: boolean) {
    this.view.setUint16(offset, value, littleEndian);
  }

  setInt32(offset: number, value: number, littleEndian?: boolean) {
    this.view.setInt32(offset, value, littleEndian);
  }

  setUint32(offset: number, value: number, littleEndian?: boolean) {
    this.view.setUint32(offset, value, littleEndian);
  }

  setFloat32(offset: number, value: number, littleEndian?: boolean) {
    this.view.setFloat32(offset, value, littleEndian);
  }

  getFloat32Array(offset: number, num: number) {
    return new Float32Array();
  }

  setFloatArray(offset: number, arr: ArrayLike<number>, littleEndian?: boolean) {
    //
  }

  drawElementsInstanced(count: number) {
    
  }
}

const INDEX_DATA = new Int16Array([
  0, 1, 2, 2, 3, 1, 1, 4, 2, 2, 5, 6, 6, 4, 5, 7, 8, 6, 9, 10, 12, 11, 9, 10, 14, 13, 12, 13, 14, 15
]);

// cast to array buffer
const sampleBufferData = INDEX_DATA.buffer.slice(0);

describe("GLIndexImpl", function() {
  it("Should properly point to index elements", function() {
    let buffer = new BufferStub(sampleBufferData);

    let accessorInd : Accessor = {
      bufferView: 0,
      byteOffset: 0,
      componentType: DataType.SHORT,
      count: 30,
      min: [0],
      max: [15],
      type: GLTFAccessorType.SCALAR
    };

    let view : BufferView = {
      buffer: 0,
      byteLength: 60,
      byteOffset: 0,
      byteStride: 0
    };

    let ind = new GLIndexImpl(buffer, accessorInd, view);
    ind.draw();
    
    let actual = buffer.getIndices();

    expect(actual.length).to.equal(INDEX_DATA.length);
    for (let i = 0; i < INDEX_DATA.length; i++) {
      expect(actual[i]).to.equal(INDEX_DATA[i]);
    }
  })
})