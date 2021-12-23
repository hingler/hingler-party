import { ReadonlyVec3, vec3 } from "gl-matrix";
import { ParametricCurve } from "./ParametricCurve";

/**
 * A path built out of several vertices :D
 */
export class SegmentedCurve extends ParametricCurve {
  private vertexList : Array<vec3>;
  private pathLength : number;

  loop : boolean;

  constructor(vertexList: Array<vec3>) {
    super();
    this.vertexList = [];
    this.pathLength = 0;
    for (let i = 0; i < vertexList.length; i++) {
      this.vertexList.push(vec3.fromValues(vertexList[i][0], vertexList[i][1], vertexList[i][2]));
    }

    const temp = vec3.create();

    for (let i = 1; i < vertexList.length; i++) {
      vec3.sub(temp, this.vertexList[i], this.vertexList[i - 1]);
      this.pathLength += vec3.length(temp);
    }

    this.loop = false;
  }

  getPosition(time: number) {
    const t = Math.max(Math.min(time, 1), 0);
    if (t === 0) {
      return vec3.copy(vec3.create(), this.vertexList[0]);
    }
    const targetDistance = (this.pathLength * t) * (this.pathLength * t);
    let curDistance = 0;
    let cur = 1;

    const temp = vec3.create();
    while (cur < this.vertexList.length && curDistance < targetDistance) {
      vec3.sub(temp, this.vertexList[cur], this.vertexList[cur - 1]);
      curDistance += vec3.length(temp);
      cur++;
    }

    const lowCurve = this.vertexList[cur - 2];
    const highCurve = this.vertexList[cur - 1];

    vec3.sub(temp, highCurve, lowCurve);
    curDistance -= vec3.length(temp);
    return vec3.add(vec3.create(), lowCurve, vec3.scale(temp, temp, (targetDistance - curDistance) / vec3.length(temp)));
  }

  getTangent(time: number) {
    const t = Math.max(Math.min(time, 1), 0);
    const targetDistance = (this.pathLength * t) * (this.pathLength * t);
    let curDistance = 0;
    let cur = 1;
    const temp = vec3.create();
    while (cur < this.vertexList.length && curDistance < targetDistance) {
      vec3.sub(temp, this.vertexList[cur], this.vertexList[cur - 1]);
      curDistance += vec3.length(temp);
      cur++;
    }

    return vec3.normalize(temp, temp); 
  }

  getNormal(time: number, up?: ReadonlyVec3) {
    const tan = this.getTangent(time);
    let upVec: ReadonlyVec3 = up;
    if (upVec === undefined) {
      if (Math.abs(tan[1]) > 0.999) {
        upVec = vec3.fromValues(0, 0, 1);
      } else {
        upVec = vec3.fromValues(0, 1, 0);
      }
    }

    return vec3.cross(vec3.create(), tan, upVec);
  }

  getControlPointCount() {
    return this.vertexList.length;
  }

  getControlPoint(n: number) {
    if (n < 0 || n >= this.vertexList.length) {
      return null;
    }

    return vec3.copy(vec3.create(), this.vertexList[n]);
  }

  setControlPoint(n: number, val: vec3) {
    if (n >= 0 && n < this.vertexList.length) {
      this.vertexList[n] = val;
    }
  }

  get arcLength() {
    return this.pathLength;
  }
}
