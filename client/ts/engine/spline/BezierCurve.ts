import { ReadonlyVec3, vec2, vec3 } from "gl-matrix";
import { ParametricCurve } from "./ParametricCurve";

const DEFAULT_STEP_COUNT = 200;

export class BezierCurve extends ParametricCurve {
  private p0: vec3;
  private p1: vec3;
  private p2: vec3;
  private p3: vec3;

  private timeSteps: number;
  private lut: Array<number>;
  
  constructor(p0_x: number, p0_y: number, p0_z: number, p1_x: number, p1_y: number, p1_z: number, p2_x: number, p2_y: number, p2_z: number, p3_x: number, p3_y: number, p3_z: number) {
    super();
    this.p0 = [p0_x, p0_y, p0_z];
    this.p1 = [p1_x, p1_y, p1_z];
    this.p2 = [p2_x, p2_y, p2_z];
    this.p3 = [p3_x, p3_y, p3_z];

    this.timeSteps = DEFAULT_STEP_COUNT;

    this.createLUT();
  }

  private createLUT() {
    // create look up table for bezier curve so that we get time independent sampling
    this.lut = [];
    const tStep = 1.0 / this.timeSteps;
    let startVec = this.getPosition(0);
    const temp = vec3.create();
    for (let i = 0; i <= this.timeSteps; i++) {
      const time = tStep * i;
      const prev = (i > 0 ? this.lut[i - 1] : 0);
      const end = this.getPosition(time);
      const endDiff = vec3.copy(temp, end);
      vec3.sub(endDiff, end, startVec);
      const dist = vec3.length(endDiff);
      this.lut.push(dist + prev);
      startVec = end;
    }
  }

  get arcLength() {
    return this.lut[this.lut.length - 1];
  }

  get segmentCount() {
    return 1;
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

    this.createLUT();
    this.update();
  }

  getPosition(time: number) : vec3 {
    const t = Math.max(Math.min(time, 1), 0);

    return vec3.bezier(vec3.create(), this.p0, this.p1, this.p2, this.p3, t);
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
        upVec = vec3.fromValues(0, 0, -Math.sign(tangent[1]));
      } else {
        upVec = vec3.fromValues(0, 1, 0);
      }
    }

    const res = vec3.create();
    vec3.cross(res, tangent, upVec);

    return res;
  }

  private reparameterizeTime(time: number) {
    const t = Math.max(Math.min(1, time), 0);
    const end = this.arcLength;
    const desiredLength = t * end;
    let cur = 0;
    for (; cur < this.lut.length && this.lut[cur] <= desiredLength; cur++);

    if (cur <= 0) {
      return 0;
    } else if (cur >= this.lut.length) {
      cur--;
    }

    const stepSize = 1.0 / (this.lut.length - 1);
    const tSub = (desiredLength - this.lut[cur - 1]) / (this.lut[cur] - this.lut[cur - 1]);
    const tRes = stepSize * (cur - 1) + (tSub * stepSize);
    return Math.max(Math.min(tRes, 1), 0);
  }

  // LUT FUNCTIONS - arc length reparameterization
  // t should be equivalent to a fraction of the desired curve length

  getPositionLut(time: number) {
    return this.getPosition(this.reparameterizeTime(time));
  }

  getVelocityLut(time: number) {
    return this.getVelocity(this.reparameterizeTime(time));
  }

  getTangentLut(time: number) {
    return this.getTangent(this.reparameterizeTime(time));
  }

  getNormalLut(time: number, up?: vec3) {
    return this.getNormal(this.reparameterizeTime(time), up);
  }

  static fromVec3(p0: vec3, p1: vec3, p2: vec3, p3: vec3) {
    return new BezierCurve(p0[0], p0[1], p0[2], p1[0], p1[1], p1[2], p2[0], p2[1], p2[2], p3[0], p3[1], p3[2]);
  }

  getControlPointCount() { return 4; }

  getSegmentLength(ind: number) {
    if (ind !== 0) {
      return 0;
    }

    return this.lut[this.lut.length - 1];
  }
}