import { mat3 } from "gl-matrix";
import { GLBufferReadOnly } from "../gl/internal/GLBuffer";
import { GLBufferImpl } from "../gl/internal/GLBufferImpl";

export function CalculateNormalMatrixFromBuffer(src: GLBufferReadOnly, dst: GLBufferImpl, instances: number, offset?: number, stride?: number) {
  let step = (stride === 0 ? 64 : stride);
  if (src.size() < instances * step + offset) {
    const warning = "Buffer is not large enough to hold described number of matrices.";
    console.warn(warning);
  }


  let offsetSrc = offset;
  let offsetDst = 0;

  let normSpace : mat3 = mat3.create();

  for (let i = 0; i < instances; i++) {
    let mat = src.getFloat32Array(offset, 16);
    offset += step;

    mat3.fromMat4(normSpace, mat);
    mat3.transpose(normSpace, normSpace);
    mat3.invert(normSpace, normSpace);

    dst.setFloatArray(offsetDst, normSpace);
    offsetDst += 36;
  }
}