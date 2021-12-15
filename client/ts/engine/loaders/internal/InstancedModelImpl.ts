import { ReadonlyMat3, ReadonlyMat4 } from "gl-matrix";
import { perf } from "../../../../../ts/performance";
import { GameContext } from "../../GameContext";
import { GLBuffer, GLBufferReadOnly } from "../../gl/internal/GLBuffer";
import { GLBufferImpl } from "../../gl/internal/GLBufferImpl";
import { logRender } from "../../internal/performanceanalytics";
import { InstancedMaterial } from "../../material/InstancedMaterial";
import { InstancedModel } from "../../model/InstancedModel";
import { AttributeType } from "../../model/Model";
import { RenderContext } from "../../render/RenderContext";
import { ModelImpl } from "./ModelImpl";

interface BufferRecord {
  buf: GLBufferImpl,
  offset: number;
}

interface AttributeInfo {
  index: number,
  components: number,
  type: number,
  normalize: boolean,
  stride: number,
  offset: number
};

export class InstancedModelImpl implements InstancedModel {
  private ctx: GameContext;
  private model: ModelImpl;
  private instances: Map<number, BufferRecord>;
  private instanceCount: number;
  private mat: InstancedMaterial;
  // map numbers to buffer indices
  private enabledAttributes: Set<number>;
  private attributeToBuffer: Map<number, number>;

  constructor(ctx: GameContext, model: ModelImpl) {
    this.model = model;
    this.ctx = ctx;
    this.instances = new Map();
    this.instanceCount = 0;
    this.enabledAttributes = new Set();
    this.attributeToBuffer = new Map();
    this.mat = null;
  }

  setInstancedMaterial(material: InstancedMaterial) {
    this.mat = material;
  }

  getReadOnlyBuffer(index: number) : GLBufferReadOnly {
    let res = this.instances.get(index);
    if (res !== null) {
      return res.buf;
    }

    return null;
  }

  clearInstances() {
    this.instanceCount = 0;
    for (let record of this.instances.values()) {
      record.offset = 0;
    }

    this.enabledAttributes = new Set();
    this.attributeToBuffer = new Map();
  }

  /**
   * renders all currently stored instances to the screen.
   */
  flush(rc: RenderContext) {
    if (this.instanceCount > 0) {
      if (this.mat !== null) {
        // TODO: instead of just passing the instance count and the model,
        // pass the render context as well!
        try {
          this.mat.prepareAttributes(this, this.instanceCount, rc);
          this.model.drawInstanced(this.instanceCount);
          this.mat.cleanUpAttributes();
        } catch (e) {
          console.debug("Skipped draw due to caught error: " + e);
          console.debug(e);
        } finally {
          let gl = this.ctx.getGLContext(); 
          if (this.instances.size > 0) {
            for (let attrib of this.enabledAttributes) {
              let bufIndex = this.attributeToBuffer.get(attrib);
              let buf = this.instances.get(bufIndex);
              buf.buf.disableInstancedVertexAttribute(attrib);
            }
          }
          
          this.enabledAttributes = new Set();
          this.attributeToBuffer = new Map();
        }
        
      }

      
    }
    
    this.instanceCount = 0;
    // clean up instance attribs
    let gl = this.ctx.getGLContext();
    for (let attrib of this.enabledAttributes) {
      gl.disableVertexAttribArray(attrib);
    }
    
    for (let record of this.instances.values()) {
      record.offset = 0;
    }

    this.enabledAttributes = new Set();
    this.attributeToBuffer = new Map();
    let matname = (this.mat ? this.mat.constructor.name : "UnknownMaterial");
    // logRender(`InstancedModel:${matname}`, end - start);
  }
  
  bindAttribute(at: AttributeType, location: number) {
    this.model.bindAttribute(at, location);
  }

  draw() {
    this.model.draw();
  }

  drawInstanced() {
    this.instanceCount++;
  }

  drawManyInstanced(count: number) {
    this.instanceCount += count;
  }

  appendInstanceData(index: number, data: number | Array<number> | Float32Array | ReadonlyMat3 | ReadonlyMat4, ...args: Array<number>) {
    let buf = this.instances.get(index);
    if (!buf) {
      buf = {
        buf: new GLBufferImpl(this.ctx, 32768), 
        offset: 0
      };

      this.instances.set(index, buf);
    }

    if (typeof data === "number") {
      buf.buf.setFloat32(buf.offset, data, true);
      buf.offset += 4;
    } else {
      buf.buf.setFloatArray(buf.offset, data, true);
      buf.offset += (4 * data.length);
    }

    if (args !== undefined) {
      for (let arg of args) {
        buf.buf.setFloat32(buf.offset, arg, true);
        buf.offset += 4;
      }
    }
  }

  instanceAttribPointer(index: number, attribLocation: number, components: number, type: number, normalize: boolean, stride: number, offset: number) {
    if (!this.instances.has(index)) {
      let err = "Attempted to point to unmapped index";
      console.error(err);
      console.log(index);
      throw Error(err);
    }

    let buf = this.instances.get(index).buf;
    buf.bindToInstancedVertexAttribute(attribLocation, components, type, normalize, stride, offset, 1);
    this.enabledAttributes.add(attribLocation);
    this.attributeToBuffer.set(attribLocation, index);
  }
}