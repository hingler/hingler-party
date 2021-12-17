import { ReadonlyVec3, vec2, vec3 } from "gl-matrix";
import { ParametricCurve } from "./ParametricCurve";


export class BezierCurve implements ParametricCurve {
  private p0: vec3;
  private p1: vec3;
  private p2: vec3;
  private p3: vec3;
  
  constructor(p0_x: number, p0_y: number, p0_z: number, p1_x: number, p1_y: number, p1_z: number, p2_x: number, p2_y: number, p2_z: number, p3_x: number, p3_y: number, p3_z: number) {
    this.p0 = [p0_x, p0_y, p0_z];
    this.p1 = [p1_x, p1_y, p1_z];
    this.p2 = [p2_x, p2_y, p2_z];
    this.p3 = [p3_x, p3_y, p3_z];
  }

  getControlPoint(point: number) : vec3 {
    if (point >= 0 && point <= 3) {
      return Array.from(this[`p${point}`]) as [number, number, number];
    }

    return null;
  }

  setControlPoint(point: number, val: ReadonlyVec3) {
    if (point >= 0 && point < 4) {
      vec3.copy(this[`p${point}`], val);
    }
  }

  getPosition(time: number) : vec3 {
    let x: number;
    let y: number;
    let z: number;

    x = 0;
    y = 0;
    z = 0;

    const t = Math.max(Math.min(time, 1), 0);

    x += this.p0[0] * Math.pow(1 - t, 3);
    x += this.p1[0] * 3 * Math.pow(1 - t, 2) * t;
    x += this.p2[0] * 3 * (1 - t) * Math.pow(t, 2);
    x += this.p3[0] * Math.pow(t, 3);

    y += this.p0[1] * Math.pow(1 - t, 3);
    y += this.p1[1] * 3 * Math.pow(1 - t, 2) * t;
    y += this.p2[1] * 3 * (1 - t) * Math.pow(t, 2);
    y += this.p3[1] * Math.pow(t, 3);

    z += this.p0[2] * Math.pow(1 - t, 3);
    z += this.p1[2] * 3 * Math.pow(1 - t, 2) * t;
    z += this.p2[2] * 3 * (1 - t) * Math.pow(t, 2);
    z += this.p3[2] * Math.pow(t, 3);

    return [x, y, z];
  }

  getVelocity(time: number) : vec3 {
    const t = Math.max(Math.min(time, 1), 0);
    let res = vec3.create();
    const facA = 3 * (1 - t) * (1 - t);
    const facB = 6 * (1 - t) * t;
    const facC = 3 * t * t;

    res[0] = (this.p1[0] - this.p0[0]) * facA + (this.p2[0] - this.p1[0]) * facB + (this.p3[0] - this.p2[0]) * facC;
    res[1] = (this.p1[1] - this.p0[1]) * facA + (this.p2[1] - this.p1[1]) * facB + (this.p3[1] - this.p2[1]) * facC;
    res[2] = (this.p1[2] - this.p0[2]) * facA + (this.p2[2] - this.p1[2]) * facB + (this.p3[2] - this.p2[2]) * facC;

    return res;
  }

  getTangent(time: number) {
    const res = this.getVelocity(time);
    vec3.normalize(res, res);
    return res;
  }

  getNormal(time: number, up?: vec3) {
    const tangent = this.getTangent(time);
    let upVec = up;
    if (up === undefined) {
      if (Math.abs(tangent[1]) > 0.999) {
        upVec = vec3.fromValues(0, 0, 1);
      } else {
        upVec = vec3.fromValues(0, 1, 0);
      }
    }

    const res = vec3.create();
    vec3.cross(res, tangent, upVec);

    return res;
  }

  static fromVec3(p0: vec3, p1: vec3, p2: vec3, p3: vec3) {
    return new BezierCurve(p0[0], p0[1], p0[2], p1[0], p1[1], p1[2], p2[0], p2[1], p2[2], p3[0], p3[1], p3[2]);
  }

  getControlPointCount() { return 3; }
}