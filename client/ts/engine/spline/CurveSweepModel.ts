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

  private buffer: GLBufferImpl;
  private index: GLBufferImpl;

  private maxStepCount : number;

  // number of loop cuts along our curve
  private stepCount_: number;
  private flipNormals_: boolean;

  // obscure behind a setter?
  // so that we can update the model

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

    this.stepCount_ = 96;
    this.maxStepCount = 0;
    this.flipNormals_ = false;
    
    this.texOffset = vec2.fromValues(0, 0);
    this.texScale = vec2.fromValues(1, 1);

    this.buildCurveGeometry();
  }

  set stepCount(count: number) {
    if (count !== this.stepCount_) {
      this.stepCount_ = count;
      // force a model update
      this.modelVersion = -1;
    }
  }

  set flipNormals(flip: boolean) {
    if (flip !== this.flipNormals_) {
      this.flipNormals_ = flip;
      this.modelVersion = -1;
    }
  }

  updateModel() {
    if (this.curve.versionnumber !== this.modelVersion) {
      this.buildCurveGeometry();
    }

    this.modelVersion = this.curve.versionnumber;
  }

  private buildCurveGeometry() : void {
    const ctx = this.ctx;
    const gl = ctx.getGLContext();
    const curve = this.curve;
    const sweep = this.sweep;

    const positions : Array<vec3> = [];
    for (let i = 0; i < sweep.getControlPointCount(); i++) {
      positions.push(sweep.getControlPoint(i));
    }

    if (sweep.loop) {
      positions.push(sweep.getControlPoint(0));
    }

    // push control points to a list
    // use list instead of fetching

    let stepCount = Math.round(this.stepCount_);
    if (stepCount < 2) {
      stepCount = 64;
    }


    const positionBuffer = this.buffer;
    const indexBuffer = this.index;

    const vertexMem = positionBuffer.getRegionAsFloat32Array(0, positions.length * stepCount * 11);

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

    let lastPoint : vec3;

    let texCoord = vec2.create();

    const bitan = this.getBitangents();

    const curveMat = mat3.create();

    // if curve update is slow, figure out how
    // to isolate changed portions and only update geom there
    // note2: step count should contain some preservation of locality.

    // todo: perform these ops in wasm, port over?

    // implementing curve consistency:
    // use a position and tangent cache
    // if the position and tangent both change by a value greater than some epsilon, rewrite the point
    // otherwise, use the old point

    // on long curves, this should keep relatively stationary points in place :D
    // caveat: as our old curve and new curve converge, we may get some warping
    // find a decent tradeoff ig :(
    for (let i = 0; i < stepCount; i++) {
      tangent = curve.getTangent(i * tStep);
      vec3.sub(cross, crossOld, vec3.scale(temp, tangent, vec3.dot(crossOld, tangent)));
      vec3.sub(normal, normalOld, vec3.scale(temp, tangent, vec3.dot(normalOld, tangent)));

      // normalize
      vec3.normalize(cross, cross);
      vec3.normalize(normal, normal);
      
      vec3.sub(cross, cross, vec3.scale(temp, normal, vec3.dot(cross, normal)));

      vec3.normalize(cross, cross);
      vec3.copy(crossOld, cross);
      vec3.copy(normalOld, normal);

      // convert this to a mat3
      curveMat[0] = normal[0];
      curveMat[1] = normal[1];
      curveMat[2] = normal[2];
      curveMat[3] = tangent[0];
      curveMat[4] = tangent[1];
      curveMat[5] = tangent[2];
      curveMat[6] = cross[0];
      curveMat[7] = cross[1];
      curveMat[8] = cross[2];

      const origin = curve.getPosition(i * tStep);
      sweepDist = 0;
      
      for (let j = 0; j < positions.length; j++) {
        const point = positions[j];
        if (j > 0) {
          vec3.sub(temp, point, lastPoint);
          sweepDist += vec3.length(temp);
        }

        lastPoint = point;

        vec3.transformMat3(temp, point, curveMat);
        vec3.add(temp, temp, origin);

        // positionBuffer.setFloatArray(cur, temp, true);
        const memOffset = 11 * (positions.length * i + j);
        vertexMem[memOffset] = temp[0];
        vertexMem[memOffset + 1] = temp[1];
        vertexMem[memOffset + 2] = temp[2];
        cur += 12;
        
        vec3.zero(temp);

        const bitangent = bitan[j % bitan.length];

        vec3.transformMat3(temp, bitangent, curveMat);
        vec3.cross(temp, tangent, temp);
        vec3.normalize(temp, temp);
        
        // set normal
        // positionBuffer.setFloatArray(cur, temp, true);
        vertexMem[memOffset + 3] = temp[0];
        vertexMem[memOffset + 4] = temp[1];
        vertexMem[memOffset + 5] = temp[2];
        cur += 12;
        
        // set tangent
        // positionBuffer.setFloatArray(cur, tangent, true);
        vertexMem[memOffset + 6] = tangent[0];
        vertexMem[memOffset + 7] = tangent[1];
        vertexMem[memOffset + 8] = tangent[2];
        cur += 12;

        // set texcoord
        texCoord[0] = (i * tStep) * this.texScale[0] + this.texOffset[0];
        texCoord[1] = (sweepDist / sweep.arcLength) * this.texScale[1] + this.texOffset[1];
        // positionBuffer.setFloatArray(cur, texCoord, true);
        vertexMem[memOffset + 9] = texCoord[0];
        vertexMem[memOffset + 10] = texCoord[1];
        cur += 8;
      }
    }

    if (stepCount > this.maxStepCount) {
      console.log("index updated???");
      for (let i = 1; i < stepCount; i++) {
        for (let j = 0; j < positions.length - 1; j++) {
          for (let k = 0; k < INDEX_ARRAY.length; k++) {
            // note: we only need to rebuild our index if the curve grows (step count inc) -- otherwise, we can just update the index object
            const ind = INDEX_ARRAY[k];
            const input = Math.floor(ind / 2) * positions.length + (ind % 2) + j;
            indexBuffer.setUint16(indcur, input + positions.length * (i - 1), true);
            indcur += 2;
          }
        }
      }
    }

    this.maxStepCount = Math.max(this.maxStepCount, stepCount);

    const BYTE_STRIDE = 44;

    const index = GLIndexImpl.createFromValues(indexBuffer, gl.UNSIGNED_SHORT, (stepCount - 1) * (positions.length - 1) * INDEX_ARRAY.length, 0);

    const positionAtt = GLAttributeImpl.createFromValues(positionBuffer, 3, gl.FLOAT, positions.length * stepCount, 0, BYTE_STRIDE);
    const normalAtt = GLAttributeImpl.createFromValues(positionBuffer, 3, gl.FLOAT, positions.length * stepCount, 12, BYTE_STRIDE);
    const tangentAtt = GLAttributeImpl.createFromValues(positionBuffer, 3, gl.FLOAT, positions.length * stepCount, 24, BYTE_STRIDE);
    const texcoordAtt = GLAttributeImpl.createFromValues(positionBuffer, 2, gl.FLOAT, positions.length * stepCount, 36, BYTE_STRIDE);

    this.model = new ModelImpl([{ positions: positionAtt, normals: normalAtt, tangents: tangentAtt, texcoords: texcoordAtt, indices: index }]);
  }

  private getBitangents() {
    const sweep = this.sweep;

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
    // if we swap models, we have to rebind every attribute
    if (this.curve.versionnumber !== this.modelVersion || !this.model) {
      const modelOld = this.model;
      this.buildCurveGeometry();
      this.modelVersion = this.curve.versionnumber;
      const modelNew = this.model;
      modelNew.posLocation = modelOld.posLocation;
      modelNew.normLocation = modelOld.normLocation;
      modelNew.texLocation = modelOld.texLocation;
      modelNew.tangentLocation = modelOld.tangentLocation;
      modelNew.weightLocation = modelOld.weightLocation;
      modelNew.jointLocation = modelOld.jointLocation;
    }

    this.model.draw();
  }
}
