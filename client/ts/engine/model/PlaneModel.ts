
import {vec2, vec3} from "gl-matrix";
import {GameContext} from "../GameContext";
import {GLAttributeImpl} from "../gl/internal/GLAttributeImpl";
import {GLBufferImpl} from "../gl/internal/GLBufferImpl";
import {GLIndexImpl} from "../gl/internal/GLIndexImpl";
import {Accessor, BufferView} from "../loaders/internal/gltfTypes";
import {ModelImpl, ModelInstance} from "../loaders/internal/ModelImpl";

/**
 * Plane lying on local XZ plane.
 */ 
export class PlaneModel extends ModelImpl {
  
  /**
   *  Creates a new PlaneModel.
   *  @param w - width of this plane, in object space units.
   *  @param h - height of this plane, in object space units.
   *  @param subs - number of subdivisions on our plane.
   */ 
  constructor(ctx: GameContext, w: number, h: number, subs: number) {
    // temp fix
    // we'll generate attributes later
    // to avoid this problem
    // normals will all face up
    // texcoords 0 - 1 on wh
    // tangents in one of those directions lol
    // no weights, no joints

    let gl = ctx.getGLContext();

    let planebuf = new GLBufferImpl(gl);
    
    let pos = vec3.create();
    let norm = vec3.create();
    let tex = vec2.create();
    let tan = vec3.create();
    

    norm[0] = 0;
    norm[1] = 1;
    norm[2] = 0;

    tan[0] = 1;
    tan[1] = 0;
    tan[2] = 0;

    // y coordinate is always 0 -- plane lies on XZ plane
    pos[1] = 0;

    let bufferOffset = 0;
    let yOffset = -(w / 2);
    const ystep = (w / (subs - 1));
    const xstep = (h / (subs - 1));
    for (let i = 0; i < subs; i++) {
      let xOffset = -(h / 2);
      pos[2] = yOffset;
      tex[1] = i / (subs - 1);
      for (let j = 0; j < subs; j++) {
        pos[0] = xOffset;
        
        // tex
        tex[0] = j / (subs - 1);
        
        planebuf.setFloatArray(bufferOffset, pos);
        bufferOffset += 12;

        planebuf.setFloatArray(bufferOffset, norm);
        bufferOffset += 12;

        planebuf.setFloatArray(bufferOffset, tex);
        bufferOffset += 8;

        planebuf.setFloatArray(bufferOffset, tan);
        bufferOffset += 12;
        
        xOffset += xstep;
      }

      yOffset += ystep;
    }

    let indexbuf = new GLBufferImpl(gl);
    let indexOffset = 0;
    const korn = (subs - 1);

    const setFunc = (subs > 250 ? indexbuf.setUint32.bind(indexbuf) : indexbuf.setUint16.bind(indexbuf));
    const offset = (subs > 250 ? 4 : 2);
    for (let i = 0; i < korn; i++) {
      for (let j = 0; j < korn; j++) {
        setFunc(indexOffset, (i + 1) * subs + j + 1, true);
        setFunc(indexOffset + offset, i * subs + j + 1, true);
        setFunc(indexOffset + 2 * offset, i * subs + j, true);
        
        setFunc(indexOffset + 3 * offset, (i + 1) * subs + j, true);
        setFunc(indexOffset + 4 * offset, (i + 1) * subs + j + 1, true);
        setFunc(indexOffset + 5 * offset, i * subs + j, true);

        indexOffset += 6 * offset;
      }
    }
    

    const accInd : Accessor = {
      bufferView: 0,
      byteOffset: 0,
      componentType: (subs > 250 ? gl.UNSIGNED_INT : gl.UNSIGNED_SHORT),
      count: (korn * korn * 6),
      min: [0],
      max: [subs * subs],
      type: "SCALAR"
    };

    const viewInd : BufferView = {
      buffer: 0,
      byteLength: indexbuf.size(),
      byteOffset: 0,
      byteStride: 0
    };
  

    let ind = new GLIndexImpl(indexbuf, accInd, viewInd);

    const VERT_COUNT = subs * subs;
    const BYTE_STRIDE = 44;

    let posAtt = GLAttributeImpl.createFromValues(planebuf, 3, gl.FLOAT, subs * subs, 0, BYTE_STRIDE);
    let normAtt = GLAttributeImpl.createFromValues(planebuf, 3, gl.FLOAT, VERT_COUNT, 12, BYTE_STRIDE);
    let texAtt = GLAttributeImpl.createFromValues(planebuf, 2, gl.FLOAT, VERT_COUNT, 24, BYTE_STRIDE);
    let tanAtt = GLAttributeImpl.createFromValues(planebuf, 3, gl.FLOAT, VERT_COUNT, 32, BYTE_STRIDE);
    
    let inst = {} as ModelInstance;
    inst.indices = ind;
    inst.positions = posAtt;
    inst.normals = normAtt;
    inst.texcoords = texAtt;
    inst.tangents = tanAtt;

    // configure attribs from our buffers
    super([inst]);
  }
}
