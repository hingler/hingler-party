// sweeps a path along a curve
// say we're building a path on the fly, what features do we want?

import { vec2, mat3, mat4, vec3 } from "gl-matrix";
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

  // number of loop cuts along our curve
  stepCount: number;

  // offset ST generated tex coordinates
  texOffset: vec2;

  // modify texture coordinate scale
  texScale: vec2;

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
    
    this.texOffset = vec2.fromValues(0, 0);
    this.texScale = vec2.fromValues(1, 1);

    this.buildCurveGeometry();
  }

  private buildCurveGeometry() : void {
    const ctx = this.ctx;
    const gl = ctx.getGLContext();
    const curve = this.curve;
    const sweep = this.sweep;
    const pointCount = this.sweep.getControlPointCount();

    const curveLength = this.curve.arcLength;    
    const sweepLength = this.sweep.arcLength;

    // push control points to a list
    // use list instead of fetching

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
    
    // progress along our sweep
    let sweepDist : number;

    let curveDist : number;
    let lastPoint : vec3;

    let texCoord = vec2.create();

    const bitan = this.getBitangents();

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
      sweepDist = 0;
      for (let j = 0; j < pointCount; j++) {
        const point = sweep.getControlPoint(j);
        if (j > 0) {
          vec3.sub(temp, point, lastPoint);
          sweepDist += vec3.length(temp);
        }

        lastPoint = point;

        vec3.zero(temp_scale);

        vec3.scale(temp_scale, normal, point[0]);
        vec3.add(origin, origin, temp_scale);

        vec3.scale(temp_scale, cross, point[2]);
        vec3.add(origin, origin, temp_scale);
        
        vec3.scale(temp_scale, tangent, point[1]);
        vec3.add(origin, origin, temp_scale);

        positionBuffer.setFloatArray(cur, origin, true);
        cur += 12;
        
        // todo: set normals :D
        
        vec3.zero(origin);

        vec3.scale(temp_scale, normal, bitan[i][0]);
        vec3.add(origin, origin, temp_scale);

        vec3.scale(temp_scale, cross, bitan[i][2]);
        vec3.add(origin, origin, temp_scale);

        vec3.scale(temp_scale, tangent, bitan[i][1]);
        vec3.add(origin, origin, temp_scale);
        
        vec3.normalize(origin, origin);
        // vertex bitangent is now in global coords
        // tangent is also in global coords

        // normal = tangent x bitangent
        vec3.cross(temp, tangent, origin);
        // bitangent is in curve space
        // convert to model space by multiplying by our tangent transform

        // todo: facing inwards or outwards
        positionBuffer.setFloatArray(cur, temp, true);
        cur += 12;
        
        // set tangent
        positionBuffer.setFloatArray(cur, tangent, true);
        cur += 12;

        // set texcoord
        texCoord[0] = (i * tStep) * this.texScale[0] + this.texOffset[0];
        texCoord[1] = (sweepDist / sweep.arcLength) * this.texScale[1] + this.texOffset[1];
        positionBuffer.setFloatArray(cur, texCoord, true);
        cur += 8;
      }

      if (i >= 1) {
        for (let j = 0; j < pointCount - 1; j++) {
          for (let k = 0; k < INDEX_ARRAY.length; k++) {
            const ind = INDEX_ARRAY[k];
            const input = Math.floor(ind / 2) * pointCount + (ind % 2) + j;
            indexBuffer.setUint16(indcur, input + pointCount * (i - 1), true);
            indcur += 2;
          }
        }
      }
    }

    const BYTE_STRIDE = 44;

    const index = GLIndexImpl.createFromValues(indexBuffer, gl.UNSIGNED_SHORT, indcur / 2, 0);
    const positionAtt = GLAttributeImpl.createFromValues(positionBuffer, 3, gl.FLOAT, curve.getControlPointCount() * stepCount, BYTE_STRIDE, 0);
    const normalAtt = GLAttributeImpl.createFromValues(positionBuffer, 3, gl.FLOAT, curve.getControlPointCount() * stepCount, BYTE_STRIDE, 12);
    const tangentAtt = GLAttributeImpl.createFromValues(positionBuffer, 3, gl.FLOAT, curve.getControlPointCount() * stepCount, BYTE_STRIDE, 24);
    const texcoordAtt = GLAttributeImpl.createFromValues(positionBuffer, 2, gl.FLOAT, curve.getControlPointCount() * stepCount, BYTE_STRIDE, 36);

    this.model = new ModelImpl([{ positions: positionAtt, normals: normalAtt, tangents: tangentAtt, texcoords: texcoordAtt, indices: index }]);
  }

  private getBitangents() {
    const sweep = this.sweep;
    const curve = this.curve;

    let controlPointList : Array<vec3> = [];
    
    if (sweep.loop) {
      controlPointList.push(sweep.getControlPoint(sweep.getControlPointCount() - 1));
    } else {
      controlPointList.push(sweep.getControlPoint(0));
    }

    for (let i = 0; i < sweep.getControlPointCount(); i++) {
      controlPointList.push(sweep.getControlPoint(i));
    }

    if (sweep.loop) {
      controlPointList.push(sweep.getControlPoint(0));
    } else {
      controlPointList.push(sweep.getControlPoint(sweep.getControlPointCount() - 1));
    }
    
    // (duplicate the end points if loop, otherwise cycle)
    // 0 to n: push bitangents to an array

    let bitangentList : Array<vec3> = [];
    let temp_two = vec3.create();
    for (let i = 0; i < sweep.getControlPointCount(); i++) {
      const temp = vec3.create();
      const last = controlPointList[i];
      const curr = controlPointList[i + 1];
      const next = controlPointList[i + 2];

      vec3.sub(temp, curr, last);
      vec3.sub(temp_two, next, curr);

      vec3.normalize(temp, temp);
      vec3.normalize(temp_two, temp_two);

      vec3.add(temp, temp, temp_two);
      vec3.normalize(temp, temp);

      bitangentList.push(temp);
    }

    return bitangentList;
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
