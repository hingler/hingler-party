import { GLModelSpec } from "nekogirl-valhalla/model/GLModelSpec";
import { GLIndexImpl } from "../gl/internal/GLIndexImpl";
import { ModelInstance } from "../loaders/internal/ModelImpl";
import { ReadWriteBuffer } from "nekogirl-valhalla/buffer/ReadWriteBuffer";
import { GLBuffer } from "../gl/internal/GLBuffer";
import { GLBufferImpl } from "../gl/internal/GLBufferImpl";
import { GameContext } from "../GameContext";
import { GLAttributeImpl } from "../gl/internal/GLAttributeImpl";
import { AttributeType } from "nekogirl-valhalla/model/AttributeType";

const fieldMap = {
}

fieldMap[AttributeType.POSITION] = "positions";
fieldMap[AttributeType.NORMAL] = "normals";
fieldMap[AttributeType.TEXCOORD] = "texcoords";
fieldMap[AttributeType.TANGENT] = "tangents";
fieldMap[AttributeType.JOINT] = "joints";
fieldMap[AttributeType.WEIGHT] = "weights";

export function modelInstanceFromSpec(ctx: GameContext, spec: GLModelSpec) : ModelInstance {
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
  
  buffers.add(index.buffer);
  // map from buffers to our unique GLBuffers
  const glBuffers = new Map<ReadWriteBuffer, GLBuffer>();
  for (let buffer of buffers) {
    glBuffers.set(buffer, new GLBufferImpl(ctx, buffer));
  }

  for (let attrib of attribs) {
    const data = attrib[1];
    const attr = GLAttributeImpl.createFromValues(glBuffers.get(data.buffer), data.components, data.type, data.count, data.offset, data.stride);
    res[fieldMap[attrib[0]]] = attr;
  }

  const indBuffer = glBuffers.get(index.buffer);
  const ind = GLIndexImpl.createFromValues(indBuffer, index.type, index.count, index.offset);
  res.indices = ind;

  return res;
}