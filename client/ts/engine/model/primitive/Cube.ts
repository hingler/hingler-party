import { GameContext } from "../../GameContext";
import { ModelImpl, ModelInstance } from "../../loaders/internal/ModelImpl";
import { vec2, ReadonlyVec2, vec3, ReadonlyVec3 } from "gl-matrix";
import { GLBufferImpl } from "../../gl/internal/GLBufferImpl";
import { GLAttributeImpl } from "../../gl/internal/GLAttributeImpl";
import { GLIndexImpl } from "../../gl/internal/GLIndexImpl";
import { ModelOptions } from "../ModelOptions";
import { IReadWriteBuffer } from "nekogirl-valhalla/buffer/IReadWriteBuffer";
import { GLBuffer } from "../../gl/internal/GLBuffer";

const texcoord : Array<ReadonlyVec2> = [
  [0, 0],
  [0, 1],
  [1, 1],
  [1, 0]
];

const tangents : Array<ReadonlyVec3> = [
  [-1, 0, 0],
  [0, 0, 1],
  [1, 0, 0],
  [0, 0, -1],
  [-1, 0, 0],
  [-1, 0, 0]
];

const normals : Array<ReadonlyVec3> = [
  [0, 0, 1],
  [1, 0, 0],
  [0, 0, -1],
  [-1, 0, 0],
  [0, 1, 0],
  [0, -1, 0]
];

const BYTE_STRIDE = 44;

// write a class which returns buffers and offsets
// allowing us to more efficiently pack several models into a single buffer if need be

export class Cube extends ModelImpl {

  constructor(ctx: GameContext, sideLen: number, opts?: ModelOptions<GLBuffer>) {
    let geomBuffer : GLBuffer;
    let indexBuffer : GLBuffer;

    let geomByteOffset = 0;
    let indByteOffset = 0;
    
    if (opts && opts.geometryBuffer) {
      geomBuffer = opts.geometryBuffer.buffer;
      geomByteOffset = opts.geometryBuffer.offset;
    } else {
      geomBuffer = new GLBufferImpl(ctx);
    }

    if (opts && opts.indexBuffer) {
      indexBuffer = opts.indexBuffer.buffer;
      indByteOffset = opts.indexBuffer.offset;
    } else {
      indexBuffer = new GLBufferImpl(ctx);
    }

    const indArray = indexBuffer.getRegionAsUint16Array(indByteOffset, 36);
    const geomArray = geomBuffer.getRegionAsFloat32Array(geomByteOffset, 11 * 24);

    
    let indOffset = 0;
    let geomOffset = 0;
    
    const bitan = vec3.create();
    const temp = vec3.create();

    for (let i = 0; i < 6; i++) {
      vec3.zero(temp);
      const tan = tangents[i];
      const norm = normals[i];
      
      vec3.cross(bitan, norm, tan);
      
      vec3.scaleAndAdd(temp, temp, norm, sideLen / 2);
      vec3.scaleAndAdd(temp, temp, tan, sideLen / 2);
      vec3.scaleAndAdd(temp, temp, bitan, -sideLen / 2);
      
      geomOffset = Cube.pushToGeomBuffer(temp, norm, texcoord[0], tan, geomArray, geomOffset);
      
      vec3.scaleAndAdd(temp, temp, bitan, sideLen);
      geomOffset = Cube.pushToGeomBuffer(temp, norm, texcoord[1], tan, geomArray, geomOffset);
      
      vec3.scaleAndAdd(temp, temp, tan, -sideLen);
      geomOffset = Cube.pushToGeomBuffer(temp, norm, texcoord[2], tan, geomArray, geomOffset);
      
      vec3.scaleAndAdd(temp, temp, bitan, -sideLen);
      geomOffset = Cube.pushToGeomBuffer(temp, norm, texcoord[3], tan, geomArray, geomOffset);
    }
    
    for (let i = 0; i < 6; i++) {
      const c = 4 * i;
      indArray[indOffset++] = c;
      indArray[indOffset++] = c + 1;
      indArray[indOffset++] = c + 2;
      indArray[indOffset++] = c + 2;
      indArray[indOffset++] = c + 3;
      indArray[indOffset++] = c;
    }
    
    const gl = ctx.getGLContext();
    
    const posAtt = GLAttributeImpl.createFromValues(geomBuffer, 3, gl.FLOAT, 24, geomByteOffset, BYTE_STRIDE);
    const normAtt = GLAttributeImpl.createFromValues(geomBuffer, 3, gl.FLOAT, 24, geomByteOffset + 12, BYTE_STRIDE);
    const texAtt = GLAttributeImpl.createFromValues(geomBuffer, 2, gl.FLOAT, 24, geomByteOffset + 24, BYTE_STRIDE);
    const tanAtt = GLAttributeImpl.createFromValues(geomBuffer, 3, gl.FLOAT, 24, geomByteOffset + 32, BYTE_STRIDE);
    
    const indAtt = GLIndexImpl.createFromValues(indexBuffer, gl.UNSIGNED_SHORT, 36, indByteOffset);
    
    geomByteOffset += 11 * 24 * 4;
    indByteOffset += 36 * 2;

    if (opts && opts.geometryBuffer) {
      opts.geometryBuffer.offset = geomByteOffset;
    }

    if (opts && opts.indexBuffer) {
      opts.indexBuffer.offset = indByteOffset;
    }

    const inst : ModelInstance = {
      positions: posAtt,
      normals: normAtt,
      texcoords: texAtt,
      tangents: tanAtt,

      indices: indAtt
    };

    super([ inst ]);
  }
  
  private static pushToGeomBuffer(position: ReadonlyVec3, normal: ReadonlyVec3, texcoord: ReadonlyVec2, tangent: ReadonlyVec3, geomBuffer: Float32Array, offset: number) {
    let offsetActive = offset;
    geomBuffer[offsetActive++] = position[0];
    geomBuffer[offsetActive++] = position[1];
    geomBuffer[offsetActive++] = position[2];
    geomBuffer[offsetActive++] = normal[0];
    geomBuffer[offsetActive++] = normal[1];
    geomBuffer[offsetActive++] = normal[1];
    geomBuffer[offsetActive++] = texcoord[0];
    geomBuffer[offsetActive++] = texcoord[1];
    geomBuffer[offsetActive++] = tangent[0];
    geomBuffer[offsetActive++] = tangent[1];
    geomBuffer[offsetActive++] = tangent[2];

    return offsetActive;
  }
}