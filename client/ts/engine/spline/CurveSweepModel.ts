// sweeps a path along a curve
// say we're building a path on the fly, what features do we want?

import { vec2, mat3, mat4, vec3 } from "gl-matrix";
import { GameContext } from "../GameContext";
import { GLAttributeImpl } from "../gl/internal/GLAttributeImpl";
import { GLBuffer } from "../gl/internal/GLBuffer";
import { GLBufferImpl } from "../gl/internal/GLBufferImpl";
import { GLIndexImpl } from "../gl/internal/GLIndexImpl";
import { ModelImpl } from "../loaders/internal/ModelImpl";
import { Model } from "../model/Model";
import { ParametricCurve } from "nekogirl-valhalla/spline/ParametricCurve";
import { SegmentedCurve } from "./SegmentedCurve";
import { AttributeType } from "nekogirl-valhalla/model/AttributeType";

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

  // move from "stepcount" to "quality"

  // quality entails a number of steps per distance unit
  // we will then break

  private quality_: number;

  /**
   * Creates a new CurveSweepModel.
   * @param ctx - Game context
   * @param curve - Curve we will sweep the inputted geometry on.
   * @param sweep - Series of points in our geometry, with Y direction being the tangent axis (ie "flat" geometry will lie on the xz plane)
   */
  constructor(ctx: GameContext, curve: ParametricCurve, sweep: SegmentedCurve) {
    super();
    this.curve = curve;
    this.sweep = sweep;
    
    this.buffer = new GLBufferImpl(ctx, undefined, ctx.getGLContext().STREAM_DRAW);
    this.index = new GLBufferImpl(ctx, undefined ,ctx.getGLContext().STREAM_DRAW);
    
    this.ctx = ctx;
    
    this.modelVersion = this.curve.versionnumber;

    // est number of cuts per 10 units?
    this.quality_ = 16;
    this.maxStepCount = 0;
    this.flipNormals_ = false;
    
    this.texOffset = vec2.fromValues(0, 0);
    this.texScale = vec2.fromValues(1, 1);

    this.buildCurveGeometry();
  }

  set quality(val: number) {
    if (val !== this.quality_) {
      this.quality_ = val;
      this.modelVersion = -1;
    }
  }

  set flipNormals(flip: boolean) {
    if (flip !== this.flipNormals_) {
      this.flipNormals_ = flip;
      this.modelVersion = -1;
    }
  }

  getArmature() {
    return null;
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

    const curveLength = this.curve.arcLength;

    const positions : Array<vec3> = [];
    for (let i = 0; i < sweep.getControlPointCount(); i++) {
      positions.push(sweep.getControlPoint(i));
    }

    if (sweep.loop) {
      positions.push(sweep.getControlPoint(0));
    }

    // push control points to a list
    // use list instead of fetching

    const curveSteps : Array<number> = [];
    for (let i = 0; i < curve.segmentCount; i++) {
      const steps = this.quality_ * (curve.getSegmentLength(i) / 10);
      // curves encode their ends? if so first curve needs to encode its start
      curveSteps.push(Math.round(Math.max(steps, 2)));
    }

    const stepCount = curveSteps.reduce((prev, cur) => prev + (cur - 1)) + 1;

    const positionBuffer = this.buffer;
    const indexBuffer = this.index;

    const vertexMem = positionBuffer.getRegionAsFloat32Array(0, positions.length * stepCount * 11);

    let indcur = 0;

    let temp = vec3.create();

    let tangent = curve.getTangent(0);
    let normal = curve.getNormal(0);
    
    let cross = vec3.create();
    vec3.cross(cross, normal, tangent);

    let crossOld = vec3.copy(vec3.create(), cross);
    let normalOld = vec3.copy(vec3.create(), normal);
    
    // progress along our sweep
    let sweepDist : number;

    let lastPoint : vec3;

    let texCoord = vec2.create();

    const bitan = this.getBitangents();

    const curveMat = mat3.create();

    let curveDist = 0;
    let vertexCount = 0;
    let ringCount = 0;

    for (let i = 0; i < curve.segmentCount; i++) {
      const stepCountLocal = curveSteps[i];
      const curveFract = curve.getSegmentLength(i) / curveLength;
      const tStep = (curveFract / (stepCountLocal - 1));
      const tOff = (curveDist / curveLength);
      // start at 0 if first segment -- else, start one step ahead
      for (let k = (i === 0 ? 0 : 1); k < stepCountLocal; k++) {
        ringCount++;
        const time = k * tStep + tOff;
        tangent = curve.getTangent(time);

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
        
        const origin = curve.getPosition(time);
        sweepDist = 0;

        texCoord[0] = time * this.texScale[0] + this.texOffset[0];
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
          const memOffset = 11 * (vertexCount++);
          vertexMem[memOffset] = temp[0];
          vertexMem[memOffset + 1] = temp[1];
          vertexMem[memOffset + 2] = temp[2];
          
          vec3.zero(temp);
  
          const bitangent = bitan[j % bitan.length];
  
          vec3.transformMat3(temp, bitangent, curveMat);
          vec3.cross(temp, tangent, temp);
          vec3.normalize(temp, temp);

          if (this.flipNormals_) {
            vec3.scale(temp, temp, -1);
          }
          
          // set normal
          // positionBuffer.setFloatArray(cur, temp, true);
          vertexMem[memOffset + 3] = temp[0];
          vertexMem[memOffset + 4] = temp[1];
          vertexMem[memOffset + 5] = temp[2];
          
          // set tangent
          // positionBuffer.setFloatArray(cur, tangent, true);
          vertexMem[memOffset + 6] = tangent[0];
          vertexMem[memOffset + 7] = tangent[1];
          vertexMem[memOffset + 8] = tangent[2];
  
          // need to flip texcoords for external texture
          texCoord[1] = (this.flipNormals_ ? (sweepDist / sweep.arcLength) : 1.0 - (sweepDist / sweep.arcLength)) * this.texScale[1] + this.texOffset[1];
          // positionBuffer.setFloatArray(cur, texCoord, true);
          vertexMem[memOffset + 9] = texCoord[0];
          vertexMem[memOffset + 10] = texCoord[1];
        }
      }

      curveDist += curve.getSegmentLength(i);
    }

    if (ringCount > this.maxStepCount || this.modelVersion === -1) {
      for (let i = 1; i < ringCount; i++) {
        for (let j = 0; j < positions.length - 1; j++) {
          for (let k = 0; k < INDEX_ARRAY.length; k++) {
            // note: we only need to rebuild our index if the curve grows (step count inc) -- otherwise, we can just update the index object
            const ind = INDEX_ARRAY[(this.flipNormals_ ? 5 - k : k)];
            const input = Math.floor(ind / 2) * positions.length + (ind % 2) + j;
            indexBuffer.setUint16(indcur, input + positions.length * (i - 1), true);
            indcur += 2;
          }
        }
      }
    }

    this.maxStepCount = Math.max(this.maxStepCount, ringCount);

    const BYTE_STRIDE = 44;

    const index = GLIndexImpl.createFromValues(indexBuffer, gl.UNSIGNED_SHORT, (ringCount - 1) * (positions.length - 1) * INDEX_ARRAY.length, 0);

    const positionAtt = GLAttributeImpl.createFromValues(positionBuffer, 3, gl.FLOAT, positions.length * ringCount, 0, BYTE_STRIDE);
    const normalAtt = GLAttributeImpl.createFromValues(positionBuffer, 3, gl.FLOAT, positions.length * ringCount, 12, BYTE_STRIDE);
    const tangentAtt = GLAttributeImpl.createFromValues(positionBuffer, 3, gl.FLOAT, positions.length * ringCount, 24, BYTE_STRIDE);
    const texcoordAtt = GLAttributeImpl.createFromValues(positionBuffer, 2, gl.FLOAT, positions.length * ringCount, 36, BYTE_STRIDE);

    this.model = new ModelImpl([{ positions: positionAtt, normals: normalAtt, tangents: tangentAtt, texcoords: texcoordAtt, indices: index }]);
  }

  drawInstanced(count: number) {
    // the only caveat on curvesweepmodel is that we need to keep it up to date
    // otherwise we'd do it differently
    this.model.drawInstanced(count);
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
