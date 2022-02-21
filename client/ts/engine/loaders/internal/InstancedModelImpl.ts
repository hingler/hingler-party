import { ReadonlyMat3, ReadonlyMat4 } from "gl-matrix";
import { AttributeType } from "nekogirl-valhalla/model/AttributeType";
import { perf } from "../../../../../ts/performance";
import { GameContext } from "../../GameContext";
import { GLBuffer, GLBufferReadOnly } from "../../gl/internal/GLBuffer";
import { GLBufferImpl } from "../../gl/internal/GLBufferImpl";
import { logRender, RenderType } from "../../internal/performanceanalytics";
import { InstancedMaterial } from "../../material/InstancedMaterial";
import { InstancedModel } from "../../model/InstancedModel";
import { RenderContext, RenderPass } from "../../render/RenderContext";
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
  // map numbers to buffer indices
  private enabledAttributes: Set<number>;
  private attributeToBuffer: Map<number, number>;

  // map materials to the number of instances they've drawn
  private materials: Map<InstancedMaterial, number>;

  private boundMaterial : InstancedMaterial;

  name: string;

  private logname: string;

  constructor(ctx: GameContext, model: ModelImpl) {
    this.model = model;
    this.ctx = ctx;
    this.instances = new Map();
    this.enabledAttributes = new Set();
    this.attributeToBuffer = new Map();
    this.materials = new Map();
    this.boundMaterial = null;
  }

  getArmature() {
    return this.model.getArmature();
  }

  setInstancedMaterial(material: InstancedMaterial) {
    this.boundMaterial = material;
  }

  getReadOnlyBuffer(index: number) : GLBufferReadOnly {
    let res = this.instances.get(index);
    if (res !== null) {
      return res.buf;
    }

    return null;
  }

  clearInstances() {
    this.materials.clear();
    for (let record of this.instances.values()) {
      record.offset = 0;
    }

    this.enabledAttributes = new Set();
    this.attributeToBuffer = new Map();
  }

  private drawMat(rc: RenderContext, mat: InstancedMaterial, instanceCount: number) {
    this.logname = `${this.name}.${mat.constructor.name}`;
    const timer = this.ctx.getGPUTimer();
    const id = timer.startQuery();

    try {
      mat.prepareAttributes(this, instanceCount, rc);
      this.model.drawInstanced(instanceCount);
      mat.cleanUpAttributes();
    } catch (e) {
      console.debug("Skipped draw due to caught error: " + e);
      console.debug(e);
    } finally {
      let gl = this.ctx.getGLContext(); 
      const disabledAttribs : Array<number> = [];
      if (this.instances.size > 0) {
        for (let attrib of this.enabledAttributes) {
          let bufIndex = this.attributeToBuffer.get(attrib);
          let buf = this.instances.get(bufIndex);
          buf.buf.disableInstancedVertexAttribute(attrib);
          // reset used buffers
          buf.offset = 0;
          disabledAttribs.push(attrib);
        }

        // disable any attribs which were used
        for (let attrib of disabledAttribs) {
          this.enabledAttributes.delete(attrib);
          gl.disableVertexAttribArray(attrib);
        }
      }
    }
    
    timer.stopQueryAndLog(id, this.logname, rc.getRenderPass() === RenderPass.SHADOW ? RenderType.SHADOW : RenderType.FINAL);

  }

  flush(rc: RenderContext) {
    if (this.materials.size > 0) {
      for (let mat of this.materials) {
        this.drawMat(rc, mat[0], mat[1]);
      }
  
      this.materials.clear();
      this.materials.set(this.boundMaterial, 0);
    }
  }
  
  bindAttribute(at: AttributeType, location: number) {
    this.model.bindAttribute(at, location);
  }

  draw() {
    this.model.draw();
  }

  drawInstanced() {
    let cur = this.materials.get(this.boundMaterial);
    if (cur === undefined) {
      cur = 0;
    }

    this.materials.set(this.boundMaterial, ++cur);
  }

  drawManyInstanced(count: number) {
    let cur = this.materials.get(this.boundMaterial);
    if (cur === undefined) {
      cur = 0;
    }

    this.materials.set(this.boundMaterial, cur + count);
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
      // accept any number of valid data args, iterate over in a priv
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