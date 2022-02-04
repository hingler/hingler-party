import { assert, expect } from "chai";
import { DataType } from "nekogirl-valhalla/model/DataType";
import { GameContext } from "../client/ts/engine/GameContext";
import { GLBufferImpl } from "../client/ts/engine/gl/internal/GLBufferImpl";


// TODO: stub GL with a proxy so that we can test locally
// const canvas = document.getElementById("webgl") as HTMLCanvasElement;
// const gl = canvas.getContext("webgl");
let tempGL = {} as WebGLRenderingContext;

const glstub = new Proxy(tempGL as WebGLRenderingContext, {
  get: function(target, prop, receiver) {
    return (...temp: any) => 1;
  }
});

const ctxstub = new Proxy({} as GameContext, {
  get: function(target, prop, receiver) {
    if (prop === "getGLContext") {
      return (...temp: any) => glstub;
    }

    else {
      return (..._: any) => null;
    }
  }
});

function getCTXStub(gl: WebGLRenderingContext) {
  const ctxstub = new Proxy({} as GameContext, {
    get: function(target, prop, receiver) {
      if (prop === "getGLContext") {
        return (...temp: any) => gl;
      }
  
      else {
        return (..._: any) => null;
      }
    }
  });

  return ctxstub;
}

describe("GLBuffer", function() {
  it("Should instantiate itself without crashing", function() {
    let buf = new ArrayBuffer(16);
    let buffer = new GLBufferImpl(ctxstub, buf);
  });

  it("Should return buffer data accurately", function() {
    let buf = new ArrayBuffer(32);
    let view = new DataView(buf);
    view.setInt8(0, 64);
    view.setUint8(1, 128);

    view.setInt16(2, 256, true);
    view.setUint16(4, 512, true);

    view.setInt32(6, 1024, true);
    view.setUint32(10, 2048, true);

    view.setFloat32(14, 409.6, true);

    let buffer = new GLBufferImpl(ctxstub, buf);

    expect(buffer.getInt8(0)).to.equal(64);
    expect(buffer.getUint8(1)).to.equal(128);
    expect(buffer.getInt16(2, true)).to.equal(256);
    expect(buffer.getUint16(4, true)).to.equal(512);
    expect(buffer.getInt32(6, true)).to.equal(1024);
    expect(buffer.getUint32(10, true)).to.equal(2048);
    expect(buffer.getFloat32(14, true)).to.be.approximately(409.6, 0.001);
  });

  it("Should block arrays from being used for both array and element array", function() {
    let buf = new ArrayBuffer(32);
    let glProxy = new Proxy(glstub, {
      get: function(target, prop, receiver) {
        // let everything through except drawelements, which we want to nop
        if (prop === "drawElements") {
          return (...temp: any) => null;
        } else {
          let res = target[prop];
          if (typeof res === "function") {
            return (...temp: any) => null;
          }

          return res;
        }
      }
    })

    let glbuf = new GLBufferImpl(ctxstub, buf);
    glbuf.bindToVertexAttribute(0, 2, DataType.FLOAT, false, 0, 0);
    assert.throw(() => glbuf.drawElements(0, 1, DataType.UNSIGNED_SHORT)); 
  });

  it("Should enable and disable vertex attributes as draw calls are made", function() {
    let buf = new ArrayBuffer(32);
    let boundAttribs : Set<number> = new Set();
    let glProxy = new Proxy(glstub, {
      get: function(target, prop, receiver) {
        // let everything through except drawelements, which we want to nop
        if (prop === "drawElements") {
          return (...temp: any) => null;
        } else if (prop === "enableVertexAttribArray") {
          return (val: number) => {
            boundAttribs.add(val);
          }
        } else if (prop === "disableVertexAttribArray") {
          return (val: number) => {
            boundAttribs.delete(val);
          }
        } else {
          let res = target[prop];
          if (typeof res === "function") {
            return res.bind(glstub);
          }

          return res;
        }
      }
    });

    const ctxstub = getCTXStub(glProxy);
    let glbuf = new GLBufferImpl(ctxstub, buf);
    glbuf.bindToVertexAttribute(0, 2, DataType.FLOAT, false, 0, 0);
    glbuf.bindToVertexAttribute(1, 2, DataType.UNSIGNED_SHORT, false, 0, 0);

    expect(boundAttribs.has(0)).to.be.true;
    expect(boundAttribs.has(1)).to.be.true;

    glbuf.disableVertexAttribute(0);
    glbuf.disableVertexAttribute(1);

    expect(boundAttribs.has(0)).to.be.false;
    expect(boundAttribs.has(1)).to.be.false;
  });
})