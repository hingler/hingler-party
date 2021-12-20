// sweeps a path along a curve
// say we're building a path on the fly, what features do we want?

import { mat3, mat4, vec3 } from "gl-matrix";
import { GameContext } from "../GameContext";
import { GLAttributeImpl } from "../gl/internal/GLAttributeImpl";
import { GLBuffer } from "../gl/internal/GLBuffer";
import { GLBufferImpl } from "../gl/internal/GLBufferImpl";
import { GLIndexImpl } from "../gl/internal/GLIndexImpl";
import { ModelImpl } from "../loaders/internal/ModelImpl";
import { AttributeType, Model } from "../model/Model";
import { ParametricCurve } from "./ParametricCurve";
import { SegmentedCurve } from "./SegmentedCurve";

// temeplate for building geometry from curve pieces
// add (floor(n / 2) * (path point count) to mod(n, 2)), plus point count
const INDEX_ARRAY = [1, 0, 3, 0, 2, 3];



// offset from a 

// - texture coordinate scale (along S and T)
// - texture coordinate offset (along S and T)

// to make our tunnel:
// - get arc length, pop a point
// - fractional loss of arc length * texture scale = new texture offset along curve
// - push new point
// - ensure the scale we set is maintained (probably: some constant representing units per texcoord)
// - scale should be relative to curve length - or would we prefer length?
// - i think length is easier to use

export class CurveSweepModel extends Model {
  private curve: ParametricCurve;
  private sweep: SegmentedCurve;
  private model: ModelImpl;

  private ctx: GameContext;

  readonly name = "CurveSweep";

  private modelVersion: number;

  private buffer: GLBuffer;
  private index: GLBuffer;

  private maxStepCount: GLBuffer;

  stepCount: number;

  /**
   * Creates a new CurveSweepModel.
   * @param ctx - Game context
   * @param curve - Curve we will sweep the inputted geometry on.
   * @param sweep - Series of points in our geometry, Y-up.
   */
  constructor(ctx: GameContext, curve: ParametricCurve, sweep: SegmentedCurve) {
    super();
    this.curve = curve;
    this.sweep = sweep;
    
    this.buffer = new GLBufferImpl(ctx, undefined, ctx.getGLContext().STREAM_DRAW);
    this.index = new GLBufferImpl(ctx, undefined ,ctx.getGLContext().STREAM_DRAW);
    
    this.ctx = ctx;
    
    this.modelVersion = this.curve.versionnumber;

    this.stepCount = 96;

    this.buildCurveGeometry();
  }

  private buildCurveGeometry() : void {
    const ctx = this.ctx;
    const gl = ctx.getGLContext();
    const curve = this.curve;
    const sweep = this.sweep;
    const pointCount = this.sweep.getControlPointCount();

    // find the direction of each line
    const dir: Array<boolean> = [];
    for (let i = 0; i < pointCount - 1; i++) {
      const back = sweep.getControlPoint(i);
      const front = sweep.getControlPoint(i + 1);

      let frontDir = Math.atan2(front[2], front[0]);
      let backDir = Math.atan2(back[2], back[0]);

      // use raw difference
      let delta = (frontDir - backDir);
      let dirBoolean = (true ? true : false);
      // if (delta > Math.PI) {
      //   dirBoolean = !dirBoolean;
      // }
      // if delta is greater than pi, we must have bridged the flip line -- flip logic

      dir.push(dirBoolean);

    }

    let stepCount = Math.round(this.stepCount);
    if (stepCount < 2) {
      stepCount = 64;
    }


    const positionBuffer = this.buffer;
    const indexBuffer = this.index;

    let cur = 0;
    let indcur = 0;

    const tStep = 1.0 / (stepCount - 1);
    let temp = vec3.create();
    let temp_scale = vec3.create();

    let tangent = curve.getTangent(0);
    let normal = curve.getNormal(0);
    let cross = vec3.create();
    vec3.cross(cross, tangent, normal);

    let crossOld = vec3.copy(vec3.create(), cross);
    let normalOld = vec3.copy(vec3.create(), normal);

    for (let i = 0; i < stepCount; i++) {
      // todo: avoid excessive memory allocation by passing in an output var?
      tangent = curve.getTangent(i * tStep);
      // project last normal and last cross onto tangent plane
      vec3.sub(cross, crossOld, vec3.scale(temp, tangent, vec3.dot(crossOld, tangent)));
      vec3.sub(normal, normalOld, vec3.scale(temp, tangent, vec3.dot(normalOld, tangent)));

      // normalize
      vec3.normalize(cross, cross);
      vec3.normalize(normal, normal);
      
      // adjust cross so that it is orthogonal to normal
      vec3.sub(cross, cross, vec3.scale(temp, normal, vec3.dot(cross, normal)));

      vec3.normalize(cross, cross);
      vec3.copy(crossOld, cross);
      vec3.copy(normalOld, normal);

      const origin = curve.getPosition(i * tStep);
      for (let j = 0; j < pointCount; j++) {
        const point = sweep.getControlPoint(j);
        vec3.zero(temp_scale);

        vec3.scale(temp_scale, normal, point[0]);
        vec3.add(origin, origin, temp_scale);

        vec3.scale(temp_scale, cross, point[2]);
        vec3.add(origin, origin, temp_scale);
        
        vec3.scale(temp_scale, tangent, point[1]);
        vec3.add(origin, origin, temp_scale);

        positionBuffer.setFloatArray(cur, origin, true);
        cur += 12;

      }

      if (i >= 1) {
        for (let j = 0; j < pointCount - 1; j++) {
          for (let k = 0; k < INDEX_ARRAY.length; k++) {
            // flips winding orderwhen relevant
            const ind = INDEX_ARRAY[(dir[j] ? k : INDEX_ARRAY.length - k - 1)];

            // todo: if our points spin cw vs ccw, we need to switch the index order on the fly (read it backwards)
            const input = Math.floor(ind / 2) * pointCount + (ind % 2) + j;
            // todo: exceeding 65536 points?
            // probably unlikely
            indexBuffer.setUint16(indcur, input + pointCount * (i - 1), true);
            indcur += 2;
          }
        }
      }
    }

    // todo: generate normal data, generate texcoords, generate tangents
    // todo2: allow user to flip normals on the model, possibly when we construct?

    const index = GLIndexImpl.createFromValues(indexBuffer, gl.UNSIGNED_SHORT, indcur / 2, 0);
    const position = GLAttributeImpl.createFromValues(positionBuffer, 3, gl.FLOAT, curve.getControlPointCount() * stepCount, 0, 0);

    this.model = new ModelImpl([{ positions: position, indices: index }]);
  }

  bindAttribute(at: AttributeType, ...location: number[]): void {
    if (this.model) {
      this.model.bindAttribute(at, ...location);
    }
  }

  draw() {
    if (this.curve.versionnumber !== this.modelVersion || !this.model) {
      this.buildCurveGeometry();
      this.modelVersion = this.curve.versionnumber;
    }

    this.model.draw();
  }




}
