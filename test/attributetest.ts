import { assert, expect } from "chai";
import { Accessor, BufferView } from "../client/ts/engine/loaders/internal/gltfTypes";
import { GLAttributeImpl } from "../client/ts/engine/gl/internal/GLAttributeImpl";
import { DataType, DrawMode, GLBuffer } from "../client/ts/engine/gl/internal/GLBuffer";

interface AttribRecord {
  stride: number;
  offset: number;
  type: number;
  components: number;
  normalize: boolean;
}

class BufferStub implements GLBuffer {
  private attribs: Map<number, AttribRecord>;
  private data: ArrayBuffer;
  private view: DataView;
  private elems: number;

  constructor(data: ArrayBuffer) {
    this.attribs = new Map();
    this.data = data;
    this.view = new DataView(this.data);
    this.elems = 0;
  }

  size() {
    return this.data.byteLength;
  }

  bindToInstancedVertexAttribute(...args: any) {
    // nop
  }

  setDefaultAttributeValue(location: number, components: number, ...data: number[]): void {
    // nop
  }

  arrayBuffer() {
    return this.data;
  }

  copy() {
    return null;
    // stub, never used in this ctx
  }

  bindToVertexAttribute(location: number, components: number, type: number, normalize: boolean, stride: number, offset: number) : void {
    // probably record where we bound it and then work with it
    if (this.elems === 2) {
      throw Error("!!!");
    }

    this.elems = 1;
    
    let rec: AttribRecord = {
      "stride": stride,
      "offset": offset,
      "type": type,
      "components": components,
      "normalize": normalize
    };

    this.attribs.set(location, rec);
  }

  disableVertexAttribute(location: number) {
    // nop
  }

  drawElements(offset: number, count: number, dataType: DataType, mode?: DrawMode) : void {
    if (this.elems === 1) {
      throw Error("!!!");
    }

    this.elems = 2;

    // stub for now
  }

  /**
   * Returns data currently bound to a specified vertex index
   * @param location - the index which we wish to access.
   * @returns an array of float32arrays, each index representing a single vertex's components.
   */
  getIndexData(location: number) : Array<Array<number>> {
    let accessFunc : (offset: number, littleEndian?: boolean) => number;
    let attributeWidth : number;
    let attr = this.attribs.get(location);
    if (!attr) {
      let err = `index OOB: ${location}`
      console.warn(err);
      throw Error(err);
    }

    switch (attr.type) {
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

    let curOffset = attr.offset;
    let res = [];

    while (curOffset + (attributeWidth) < this.data.byteLength) {
      let values = [];
      for (let i = 0; i < attr.components; i++) {
        values.push(accessFunc(curOffset + i * attributeWidth, true));
      }

      if (attr.stride === 0) {
        curOffset += attributeWidth * attr.components;
      } else {
        curOffset += attr.stride;
      }

      res.push(values);
    }

    return res;
  }

  drawElementsInstanced(count: number) {
    
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

  setFloatArray(offset: number, arr: ArrayLike<number>, littleEndian?: boolean) : void {
    //
  }

  disableInstancedVertexAttribute(location: number) {
    // nop
  }
}

// ensure that attributes point to buffer contents correctly
// ensure that iterators work correctly

// TODO: last test to write
// ensure that get func works correctly


// handle eof and oob cases properly in both itrs and funcs

// vec4 position -- offset 0, float, stride 32
// vec3 normal -- offset 16, float, stride 32
// vec2 texcoord -- offset 28, short, stride 32

// write here as floats and then encode later
const VERTEX_DATA = [
  0.0, 0.0, 0.0, 1.0,         0.707, 0.707, 0,     0, 0,
  1.0, 1.0, 1.0, 1.0,         -0.707, -0.707, 0,   128, 128,
  -1.0, 1.0, 1.0, 1.0,        0.5, 0.5, 0.707,     256, 256,
  -2.414, 3.612, 4.23, 1.0,   0.0, 0.0, 1.0,       512, 512
];

const sampleBufferData = new ArrayBuffer(32 * 4);
const sampleView = new DataView(sampleBufferData);

for (let i = 0; i < 4; i++) {
  let offset = 9 * i;
  sampleView.setFloat32(32 * i, VERTEX_DATA[offset], true);
  sampleView.setFloat32(32 * i + 4, VERTEX_DATA[offset + 1], true);
  sampleView.setFloat32(32 * i + 8, VERTEX_DATA[offset + 2], true);
  sampleView.setFloat32(32 * i + 12, VERTEX_DATA[offset + 3], true);

  sampleView.setFloat32(32 * i + 16, VERTEX_DATA[offset + 4], true);
  sampleView.setFloat32(32 * i + 20, VERTEX_DATA[offset + 5], true);
  sampleView.setFloat32(32 * i + 24, VERTEX_DATA[offset + 6], true);

  sampleView.setUint16(32 * i + 28, VERTEX_DATA[offset + 7], true);
  sampleView.setUint16(32 * i + 30, VERTEX_DATA[offset + 8], true);
}

describe("GLAttributeImpl", function() {
  // TODO: build a sample buffer which contains dummy data
  // positions, normals, and texcoords.
  it("Should properly point to data elements", function() {
    let accessorPos : Accessor = {
      bufferView: 0,
      byteOffset: 0,
      componentType: DataType.FLOAT,
      count: 4,
      min: [-2.414, 0.0, 0.0, 1.0],
      max: [1.0, 3.612, 4.23, 1.0],
      type: "VEC4"
    };

    let view : BufferView = {
      buffer: 0,
      byteLength: 128,
      byteOffset: 0,
      byteStride: 32
    }

    let buffer = new BufferStub(sampleBufferData);

    let attr = new GLAttributeImpl(buffer, view, accessorPos);

    attr.pointToAttribute(1);

    let res = buffer.getIndexData(1);

    // should contain position data

    // ensure stub isn't fucking up
    expect(res.length).to.equal(4);
    
    for (let i = 0; i < 4; i++) {
      let posActual = VERTEX_DATA.slice(9 * i, 9 * i + 4);
      for (let j = 0; j < 4; j++) {
        expect(res[i][j]).is.approximately(posActual[j], 0.001);
      }
    }

    accessorPos = {
      bufferView: 0,
      byteOffset: 28,
      componentType: DataType.UNSIGNED_SHORT,
      count: 2,
      min: [0, 0],
      max: [512, 512],
      type: "VEC2"
    };

    let attrTexcoord = new GLAttributeImpl(buffer, view, accessorPos);

    attrTexcoord.pointToAttribute(2);

    res = buffer.getIndexData(2);
    expect(res.length).to.equal(4);

    for (let i = 0; i < 4; i++) {
      let texActual = VERTEX_DATA.slice(9 * i + 7, 9 * i + 9);
      for (let j = 0; j < 4; j++) {
        expect(res[i][j]).is.equal(texActual[j]);
      }
    }
  });

  it("Should allow iteration over attribute contents", function() {
    let accessorPos : Accessor = {
      bufferView: 0,
      byteOffset: 0,
      componentType: DataType.FLOAT,
      count: 4,
      min: [-2.414, 0.0, 0.0, 1.0],
      max: [1.0, 3.612, 4.23, 1.0],
      type: "VEC4"
    };

    let view : BufferView = {
      buffer: 0,
      byteLength: 128,
      byteOffset: 0,
      byteStride: 32
    }

    let buffer = new BufferStub(sampleBufferData);

    let attr = new GLAttributeImpl(buffer, view, accessorPos);

    let counter = 0;
    for (let val of attr) {
      expect(val.length).to.equal(4);
      let posActual = VERTEX_DATA.slice(9 * counter, 9 * counter + 4);
      for (let j = 0; j < 4; j++) {
        expect(val[j]).is.approximately(posActual[j], 0.001);
      }

      counter++;
    }

    accessorPos = {
      bufferView: 0,
      byteOffset: 28,
      componentType: DataType.UNSIGNED_SHORT,
      count: 2,
      min: [0, 0],
      max: [512, 512],
      type: "VEC2"
    };

    let attrTexcoord = new GLAttributeImpl(buffer, view, accessorPos);

    attrTexcoord.pointToAttribute(2);

    counter = 0;
    for (let val of attrTexcoord) {
      expect(val.length).to.equal(2);
      let texActual = VERTEX_DATA.slice(9 * counter + 7, 9 * counter + 9);
      for (let j = 0; j < 2; j++) {
        expect(val[j]).is.approximately(texActual[j], 0.001);
      }
    }
  })

  it ("Should support fetching random elements", function() {
    let accessorPos : Accessor = {
      bufferView: 0,
      byteOffset: 0,
      componentType: DataType.FLOAT,
      count: 4,
      min: [-2.414, 0.0, 0.0, 1.0],
      max: [1.0, 3.612, 4.23, 1.0],
      type: "VEC4"
    };

    let view : BufferView = {
      buffer: 0,
      byteLength: 128,
      byteOffset: 0,
      byteStride: 32
    }

    let buffer = new BufferStub(sampleBufferData);

    let attr = new GLAttributeImpl(buffer, view, accessorPos);

    for (let i = 0; i < accessorPos.count; i++) {
      let val = attr.get(i);
      let actual = VERTEX_DATA.slice(9 * i, 9 * i + 4);
      expect(val.length).to.equal(4);
      for (let j = 0; j < 4; j++) {
        expect(val[j]).is.approximately(actual[j], 0.001);
      }
    }
  })
})