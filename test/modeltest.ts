// create an attribute stub which will replicate arbitrary data of a given type
// provide a length, and a component count.
// just increment and add to vector!

import { assert, expect } from "chai";
import { ModelImpl, ModelInstance } from "../client/ts/engine/loaders/internal/ModelImpl";
import { AttributeType } from "../client/ts/engine/model/Model";
import { GLAttribute } from "../client/ts/engine/gl/GLAttribute";
import { GLIndex } from "../client/ts/engine/gl/GLIndex";
import { DataType } from "../client/ts/engine/gl/internal/GLBuffer";

// 
class IndexStub implements GLIndex {
  readonly offset: number;
  readonly type: number;
  readonly count: number;
  drawn: boolean;

  constructor(count: number) {
    this.offset = 0;
    this.type = DataType.UNSIGNED_SHORT;
    this.count = count;
    this.drawn = false;
  }

  getIndex(offset: number) {
    return offset;
  }

  drawInstanced() {
    // nop, dont want this either
  }

  [Symbol.iterator]() {
    return {
      offset: 0,
      len: this.count,
      next: function() {
        if (this.offset >= this.len) {
          return {done: true, value: null};
        } else {
          this.offset++;
          return {done: (this.offset >= this.len), value: (this.offset - 1)};
        }
      }
    }
  }

  draw() {
    this.drawn = true;
  }
}

class AttributeStub implements GLAttribute {
  // creates new stub -- length is number of attributes, components is size
  length: number;
  comps: number;
  componentByteSize: number;
  boundAttribute: number;
  lastBound: number;
  count: number;
  private offset: number;
  private start: number;
  constructor(length: number, components: number, byteSize: number, start?: number) {
    this.offset = 0;
    this.length = length;
    this.count = length;
    this.comps = components;
    this.boundAttribute = -1;
    this.lastBound = -1;
    this.componentByteSize = byteSize;
    if (start) {
      this.start = start;
    } else {
      this.start = 0;
    }
  }


  pointToAttribute(location: number) {
    this.boundAttribute = location;
    this.lastBound = location;
  }

  disableAttribute() {
    this.boundAttribute = -1;
  }

  setDefaultAttribute(location: number, ...data: number[]): void {
    // nop
  }

  setDefaultAttributeComps(location: number, comps: number, ...data: number[]): void {
    // nop
  }

  [Symbol.iterator]() : Iterator<Float32Array> {
    return {
      "length": this.length,
      "components": this.comps,
      "offset": 0,
      "byteSize": this.componentByteSize,
      next: function() {
        if (this.offset >= this.length) {
          return {done: true, value: null};
        }

        let res = new Float32Array(this.components);
        for (let i = 0; i < this.components; i++) {
          res[i] = this.start + (this.offset * this.components + i) % Math.pow(2, 8 * this.componentByteSize);
        }

        this.offset++;
        return {done: (this.offset >= this.length), value: res};
      }
    } as Iterator<Float32Array>;
  }

  get(index: number) : Float32Array {
    if (index >= this.length) {
      return null;
    }

    let res = new Float32Array(this.comps);
    for (let i = 0; i < this.comps; i++) {
      res[i] = this.start + (index * this.comps + i) % (Math.pow(2, 8 * this.componentByteSize));
    }

    return res;
  }
}

// note: we're not doing any sort of integration testing yet

// ensure attributes are bound to the right location on draw
// ensure iterator works correctly for triangles
// ensure iterator works for multiple instances

describe("ModelImpl", function() {
  it("Properly binds attributes", function() {
    let len = 60;
    let pos = new AttributeStub(len, 4, 4);
    let norm = new AttributeStub(len, 3, 2);
    let tex = new AttributeStub(len, 2, 2);
    let ind = new IndexStub(len);

    let instance : ModelInstance = {
      positions: pos,
      normals: norm,
      texcoords: tex,
      indices: ind
    };

    let model = new ModelImpl([instance]);

    model.bindAttribute(AttributeType.POSITION, 1);
    model.bindAttribute(AttributeType.NORMAL, 2);
    model.bindAttribute(AttributeType.TEXCOORD, 3);
    model.draw();

    expect(ind.drawn).to.be.true;
    expect(pos.lastBound).to.be.equal(1);
    expect(norm.lastBound).to.be.equal(2);
    expect(tex.lastBound).to.be.equal(3);
    expect(pos.boundAttribute).to.be.equal(-1);
    expect(norm.boundAttribute).to.be.equal(-1);
    expect(tex.boundAttribute).to.be.equal(-1);
  });

  it("Iterates correctly over single instances", function() {
    let len = 60;
    let pos = new AttributeStub(len, 4, 4);
    let norm = new AttributeStub(len, 3, 2);
    let tex = new AttributeStub(len, 2, 2);
    let ind = new IndexStub(len);

    let instance : ModelInstance = {
      positions: pos,
      normals: norm,
      texcoords: tex,
      indices: ind
    };

    let model = new ModelImpl([instance]);

    model.bindAttribute(AttributeType.POSITION, 1);
    model.bindAttribute(AttributeType.NORMAL, 2);
    model.bindAttribute(AttributeType.TEXCOORD, 3);
    model.draw();

    for (let tri of model) {
      expect(tri.vertices.length).to.equal(3);

      // values should be associated with one another (same vertex!)
      // the arrangement of our auto generated indices + vertices
      //   means that we should see the same index of a set at the same time
      
      let maxIndex = -1;
      let minIndex = len * 5 + 1;
      let indexSet : Set<number> = new Set();
      for (let i = 0; i < 3; i++) {
        let vert = tri.vertices[i];
        expect(vert.position).is.not.null;
        expect(vert.normal).is.not.null;
        expect(vert.texcoord).is.not.null;
        expect(vert.joints).is.null;
        expect(vert.weights).is.null;
        expect(vert.position.length).to.equal(4);
        expect(vert.normal.length).to.equal(3);
        expect(vert.texcoord.length).to.equal(2);

        let index = vert.position[0] / 4;
        expect(vert.normal[0] / 3).to.equal(index);
        expect(vert.texcoord[0] / 2).to.equal(index);
        maxIndex = Math.max(maxIndex, index);
        minIndex = Math.min(minIndex, index);

        // due to how our index is configured
        expect(indexSet.has(index)).to.be.false;
        indexSet.add(index);
      }

      expect(maxIndex % 3).to.equal(2);
      expect(minIndex % 3).to.equal(0);
      expect(maxIndex - minIndex).to.equal(2);
    }
  });

  it("Iterates correctly over multiple instances", function() {
    // create three instances
    let instances = [];
    let len = 60;

    for (let i = 0; i < 3; i++) {
      let pos = new AttributeStub(len, 4, 4, len * 4 * i);
      let norm = new AttributeStub(len, 3, 2, len * 3 * i);
      let tex = new AttributeStub(len, 2, 2, len * 2 * i);
      let ind = new IndexStub(len);

      let instance : ModelInstance = {
        positions: pos,
        normals: norm,
        texcoords: tex,
        indices: ind
      };

      instances.push(instance);
    }

    let model = new ModelImpl(instances);

    model.bindAttribute(AttributeType.POSITION, 1);
    model.bindAttribute(AttributeType.NORMAL, 2);
    model.bindAttribute(AttributeType.TEXCOORD, 3);
    model.draw();

    for (let tri of model) {
      expect(tri.vertices.length).to.equal(3);

      // values should be associated with one another (same vertex!)
      // the arrangement of our auto generated indices + vertices
      //   means that we should see the same index of a set at the same time
      
      let maxIndex = -1;
      let minIndex = len * 5 + 1;
      let indexSet : Set<number> = new Set();
      for (let i = 0; i < 3; i++) {
        let vert = tri.vertices[i];
        expect(vert.position).is.not.null;
        expect(vert.normal).is.not.null;
        expect(vert.texcoord).is.not.null;
        expect(vert.joints).is.null;
        expect(vert.weights).is.null;
        expect(vert.position.length).to.equal(4);
        expect(vert.normal.length).to.equal(3);
        expect(vert.texcoord.length).to.equal(2);

        let index = vert.position[0] / 4;
        expect(vert.normal[0] / 3).to.equal(index);
        expect(vert.texcoord[0] / 2).to.equal(index);
        maxIndex = Math.max(maxIndex, index);
        minIndex = Math.min(minIndex, index);

        // due to how our index is configured
        expect(indexSet.has(index)).to.be.false;
        indexSet.add(index);
      }

      expect(maxIndex % 3).to.equal(2);
      expect(minIndex % 3).to.equal(0);
      expect(maxIndex - minIndex).to.equal(2);
    }
  });

  it("Correctly handles unbound attributes", function() {
    let len = 60;
    let pos = new AttributeStub(len, 4, 4);
    let norm = new AttributeStub(len, 3, 2);
    let tex = new AttributeStub(len, 2, 2);
    let ind = new IndexStub(len);

    let instance : ModelInstance = {
      positions: pos,
      normals: norm,
      texcoords: tex,
      indices: ind
    };

    let model = new ModelImpl([instance]);

    model.bindAttribute(AttributeType.POSITION, 1);
    model.bindAttribute(AttributeType.NORMAL, 2);
    // ignore texcoords
    model.draw();
    
    expect(ind.drawn).to.be.true;
    expect(pos.lastBound).to.be.equal(1);
    expect(norm.lastBound).to.be.equal(2);
    expect(tex.lastBound).to.be.equal(-1);
    expect(pos.boundAttribute).to.be.equal(-1);
    expect(norm.boundAttribute).to.be.equal(-1);

    // predicted behavior would be that it's unbound
    
  });
})