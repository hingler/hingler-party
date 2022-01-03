// todo: lots of file structure reorganization is necessary :(

import { vec3 } from "gl-matrix";
import { GameContext } from "../../GameContext";
import { GLAttributeImpl } from "../../gl/internal/GLAttributeImpl";
import { GLBufferImpl } from "../../gl/internal/GLBufferImpl";
import { GLIndexImpl } from "../../gl/internal/GLIndexImpl";
import { ModelImpl, ModelInstance } from "../../loaders/internal/ModelImpl";

export class Sphere extends ModelImpl {
  constructor(ctx: GameContext, ringsLong: number, ringsLat: number, radius: number) {
    const latStep = Math.PI / ringsLat;
    const longStep = 2 * Math.PI / ringsLong;

    const geomBuffer = new GLBufferImpl(ctx);
    const indBuffer = new GLBufferImpl(ctx);

    // note: we're going to bridge bottom ring and top ring to poles
    // the rest

    const tempvec = vec3.create();

    let theta = 0;

    let vertexCount = 0;

    // poles have to be computed for each lat, since texcoords differ
    const buffer = geomBuffer.getRegionAsFloat32Array(0, 11 * (ringsLat + 1) * (ringsLong + 1));
    for (let i = 0; i <= ringsLong; i++) {
      let phi = (-Math.PI / 2);
      for (let j = 0; j <= ringsLat; j++) {
        // position is converted to spherical, * radius
        // normal is normalized position
        // tangent is normal projected onto xz plane, rotated 90 degrees ccw
        // texcoord is (i / ringsLat, j / ringsLong)
        tempvec[0] = Math.cos(theta) * Math.cos(phi);
        tempvec[1] = Math.sin(phi);
        tempvec[2] = Math.sin(theta) * Math.cos(phi);

        // normal is normalized position
        const off = 11 * vertexCount;
        buffer[off] = tempvec[0];
        buffer[off + 1] = tempvec[1];
        buffer[off + 2] = tempvec[2];

        vec3.normalize(tempvec, tempvec);
        buffer[off + 3] = tempvec[0];
        buffer[off + 4] = tempvec[1];
        buffer[off + 5] = tempvec[2];

        // tangent compute
        tempvec[0] = -Math.sin(theta);
        tempvec[1] = 0;
        tempvec[2] = Math.cos(theta);

        buffer[off + 6] = -Math.sin(theta);
        buffer[off + 7] = 0;
        buffer[off + 8] = Math.cos(theta);

        buffer[off + 9] = (i / ringsLong);
        buffer[off + 10] = (j / ringsLat);
        // note that we have to double-gen the last point, once with texcoord 0 and once with texcoord 1
        phi += latStep;
        vertexCount++;
      }

      theta += longStep;
    }

    // how many polygons?
    // i = 1; i <= ringslat
    // j = 1; j <= ringsLong
    // (i - 1, j - 1) to (i, j)

    // if ringsLong * ringsLat > 2^16, use uint32??
    const indbuf = indBuffer.getRegionAsUint16Array(0, ringsLat * ringsLong * 6);
    let indexCount = 0;
    for (let i = 1; i <= ringsLat; i++) {
      for (let j = 1; j <= ringsLong; j++) {
        indbuf[indexCount++] = i * (ringsLong + 1) + j;
        indbuf[indexCount++] = i * (ringsLong + 1) + j - 1;
        indbuf[indexCount++] = (i - 1) * (ringsLong + 1) + j;

        indbuf[indexCount++] = (i - 1) * (ringsLong + 1) + j;
        indbuf[indexCount++] = i * (ringsLong + 1) + j - 1;
        indbuf[indexCount++] = (i - 1) * (ringsLong + 1) + j - 1;
      }
    }

    const gl = ctx.getGLContext();

    const BYTE_STRIDE = 44;
    const position = GLAttributeImpl.createFromValues(geomBuffer, 3, gl.FLOAT, vertexCount, 0, BYTE_STRIDE);
    const normal   = GLAttributeImpl.createFromValues(geomBuffer, 3, gl.FLOAT, vertexCount, 12, BYTE_STRIDE);
    const tangent  = GLAttributeImpl.createFromValues(geomBuffer, 3, gl.FLOAT, vertexCount, 24, BYTE_STRIDE);
    const texcoord = GLAttributeImpl.createFromValues(geomBuffer, 2, gl.FLOAT, vertexCount, 36, BYTE_STRIDE);

    const index    = GLIndexImpl.createFromValues(indBuffer, gl.UNSIGNED_SHORT, indexCount, 0);

    const instance : ModelInstance = {
      positions: position,
      normals: normal,
      tangents: tangent,
      texcoords: texcoord,
      indices: index
    };

    // todo tomorrow: double check that this is all accurate :(
    super([instance]);
  }
}