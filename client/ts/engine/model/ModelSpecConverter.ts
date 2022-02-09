import { ReadWriteBuffer } from "nekogirl-valhalla/buffer/ReadWriteBuffer";
import { AttributeType } from "nekogirl-valhalla/model/AttributeType";
import { GLModelSpec } from "nekogirl-valhalla/model/GLModelSpec";
import { GameContext } from "../GameContext";
import { GLAttributeImpl } from "../gl/internal/GLAttributeImpl";
import { GLBuffer } from "../gl/internal/GLBuffer";
import { GLBufferImpl } from "../gl/internal/GLBufferImpl";
import { GLIndexImpl } from "../gl/internal/GLIndexImpl";
import { ModelInstance } from "../loaders/internal/ModelImpl";

const fieldMap = {
}

fieldMap[AttributeType.POSITION] = "positions";
fieldMap[AttributeType.NORMAL] = "normals";
fieldMap[AttributeType.TEXCOORD] = "texcoords";
fieldMap[AttributeType.TANGENT] = "tangents";
fieldMap[AttributeType.JOINT] = "joints";
fieldMap[AttributeType.WEIGHT] = "weights";

export class ModelSpecConverter {
  private bufferMap : Map<ReadWriteBuffer, GLBuffer>;
  private ctx : GameContext;

  constructor(ctx: GameContext) {
    this.ctx = ctx;
    this.bufferMap = new Map();
  }

  private lookupBuffer(buf: ReadWriteBuffer) {
    if (!this.bufferMap.has(buf)) {
      this.bufferMap.set(buf, new GLBufferImpl(this.ctx, buf));
    }

    return this.bufferMap.get(buf);
  }

  convertModelInstance(spec: GLModelSpec) {
    const attribs = spec.getAttributes();
    const index = spec.getIndex();

    if (!index || !attribs.has(AttributeType.POSITION)) {
      return null;
    }
  
    const res = {} as ModelInstance;
    const buffers : Set<ReadWriteBuffer> = new Set();
    for (let attrib of attribs) {
      if (!buffers.has(attrib[1].buffer)) {
        buffers.add(attrib[1].buffer);
      }
    }

    for (let attrib of attribs) {
      const data = attrib[1];
      const attr = GLAttributeImpl.createFromValues(this.lookupBuffer(data.buffer), data.components, data.type, data.count, data.offset, data.stride);
      res[fieldMap[attrib[0]]] = attr;
    }

    const indBuffer = this.lookupBuffer(index.buffer);
    const ind = GLIndexImpl.createFromValues(indBuffer, index.type, index.count, index.offset);
    res.indices = ind;

    return res;
  }
}