import { vec3 } from "gl-matrix";
import { GameContext } from "../GameContext";
import { GLAttributeImpl } from "../gl/internal/GLAttributeImpl";
import { GLBufferImpl } from "../gl/internal/GLBufferImpl";
import { GLIndexImpl } from "../gl/internal/GLIndexImpl";
import { ModelImpl } from "../loaders/internal/ModelImpl";
import { FillMaterial } from "../material/FillMaterial";
import { Model } from "../model/Model";
import { GameObject } from "../object/game/GameObject";
import { RenderContext } from "../render/RenderContext";
import { ParametricCurve } from "./ParametricCurve";

export class DebugCurve extends GameObject {
  // simple sweep, just position
  // orient along tangent, cross tangent and normal to get binormal

  private mat: FillMaterial;
  private model: Model;

  constructor(ctx: GameContext, curve: ParametricCurve, steps?: number) {
    super(ctx);
    const gl = ctx.getGLContext();
    let stepCount = steps;
    if (!steps || steps < 0) {
      stepCount = curve.arcLength / 1.5;
    }

    stepCount = Math.round(stepCount);
    const positionBuffer = new GLBufferImpl(ctx);
    const indexBuffer = new GLBufferImpl(ctx);

    let cur = 0;

    let indcur = 0;

    const indexArray = [1, 0, 5, 0, 4, 5];

    const tStep = 1.0 / stepCount;
    let cross = vec3.create();
    let temp = vec3.create();
    for (let i = 0; i <= stepCount; i++) {
      const tangent = curve.getTangent(tStep * i);
      const normal = curve.getNormal(tStep * i);
      vec3.cross(cross, tangent, normal);
      vec3.normalize(cross, cross);
      if (cross[1] < 0) {
        // ensure cross is y+, for reference
        vec3.scale(cross, cross, -1);
      }
      const origin = curve.getPosition(tStep * i);
      vec3.add(temp, origin, cross);
      positionBuffer.setFloatArray(cur, temp, true);
      vec3.add(temp, origin, normal);
      positionBuffer.setFloatArray(cur + 12, temp, true);
      vec3.sub(temp, origin, cross);
      positionBuffer.setFloatArray(cur + 24, temp, true);
      vec3.sub(temp, origin, normal);
      positionBuffer.setFloatArray(cur + 36, temp, true);

      cur += 36;

      if (i >= 1) {
        for (let j = 0; j < 4; j++) {
          for (let k = 0; k < indexArray.length; k++) {
            const input = (indexArray[k] < 4 ? (indexArray[k] + j) % 4 : ((indexArray[k] + j) % 4) + 4);
            indexBuffer.setUint16(indcur, input + 4 * (i - 1));
            indcur += 2;
          }
        }
      }
    }

    const index = GLIndexImpl.createFromValues(indexBuffer, gl.UNSIGNED_SHORT, indcur / 2, 0);
    const position = GLAttributeImpl.createFromValues(positionBuffer, 3, gl.FLOAT, 0, 0);

    this.model = new ModelImpl([{ positions: position, indices: index }]);

    this.mat = new FillMaterial(ctx);
  }

  renderMaterial(rc: RenderContext): void {
    this.mat.modelMat = this.getTransformationMatrix();
    this.mat.vpMat = rc.getActiveCameraInfo().vpMatrix;
    this.mat.col = [1, 1, 1, 1];
    this.mat.drawMaterial(this.model);
  }
}