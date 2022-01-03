import { vec3 } from "gl-matrix";
import { RingArray } from "@nekogirl-valhalla/array/RingArray";
import { BezierCurve } from "./BezierCurve";
import { ParametricCurve } from "./ParametricCurve";

export class CatmullRomSpline extends ParametricCurve {
  // list of all contained curves
  private curveList: RingArray<BezierCurve>;

  private initPoint: vec3;
  constructor() {
    super();
    this.curveList = new RingArray<BezierCurve>(256);
    this.initPoint = null;
  }

  addPoint(xCoord: number | vec3, yCoord?: number, zCoord?: number) {
    const x = (typeof xCoord === "number" ? xCoord : xCoord[0]);
    const y = (typeof xCoord === "number" ? yCoord : xCoord[1]);
    const z = (typeof xCoord === "number" ? zCoord : xCoord[2]);
    const pt = [x, y, z] as vec3;

    // if its the first point, set it to initPoint
    if (this.curveList.length === 0) {
      if (this.initPoint === null) {
        this.initPoint = pt;
      } else {
        this.curveList.push(this.calculateSpline(this.initPoint, this.initPoint, pt, pt));
      }
    } else {
      const lastCurve = this.curveList.pop();

      let p1 = lastCurve.getControlPoint(0);
      let p0: vec3;
      if (this.curveList.length === 0) {
        p0 = p1;
      } else {
        const fixedCurve = this.curveList.get(this.curveList.length - 1);

        // 3 is our bezier point
        p0 = fixedCurve.getControlPoint(0);
      }

      let p2 = lastCurve.getControlPoint(3);
      let p3 = pt;

      const newLastCurve = this.calculateSpline(p0, p1, p2, p3);
      this.curveList.push(newLastCurve);

      const newCurve = this.calculateSpline(p1, p2, p3, p3);
      this.curveList.push(newCurve);
    }

    this.update();
  }

  get arcLength() {
    let res = 0;
    for (let i = 0; i < this.curveList.length; i++) {
      res += this.curveList.get(i).arcLength;
    }

    return res;
  }

  getPosition(time: number) {
    const timeMap = Math.max(Math.min(1, time), 0);
    // time should be reparameterized st t%1=0 is endpoint of a curve
    let t = this.reparameterizeTime(timeMap * this.curveList.length);
    const res = this.getPointNoLookup(t);
    return res;
  }

  getTangent(time: number) {
    const timeMap = Math.max(Math.min(1, time), 0);

    let t = this.reparameterizeTime(timeMap * this.curveList.length);
    const vel = this.getVelocityNoLookup(t);
    vec3.normalize(vel, vel);
    return vel;
  }

  getNormal(time: number, up?: vec3) {
    const timeMap = Math.max(Math.min(1, time), 0);

    let t = this.reparameterizeTime(timeMap * this.curveList.length);
    const norm = this.getNormalNoLookup(t, up);

    vec3.normalize(norm, norm);
    return norm;
  }

  popPoint() {
    // handle empty case: only one point to dequeue, or no points
    if (this.getControlPointCount() <= 1) {
      const res = this.initPoint;
      this.initPoint = null;
      return res;
    }
    const lastCurve = this.curveList.dequeue();
    
    if (this.curveList.length === 0) {
      this.initPoint = lastCurve.getControlPoint(3);
    } else {
      // handle null case -- two points, one curve.
      const oldStart = this.curveList.dequeue();
      const secondCurve = this.curveList.get(0);
      const p0 = oldStart.getControlPoint(0);
      const p1 = p0;
      const p2 = secondCurve.getControlPoint(0);
      const p3 = secondCurve.getControlPoint(3);
      const newStart = this.calculateSpline(p0, p1, p2, p3);
      this.curveList.enqueue(newStart);
    }  

    this.update();

    return lastCurve.getControlPoint(0);
  }

  getControlPoint(point: number) {
    if (this.curveList.length === 0) {
      if (this.initPoint !== null && point === 0) {
        return vec3.fromValues(this.initPoint[0], this.initPoint[1], this.initPoint[2]);
      }

      return null;
    } else {
      if (point < 0 || point > this.getControlPointCount()) {
        return null;
      }

      if (point === this.curveList.length) {
        return this.curveList.get(point - 1).getControlPoint(3);
      } else {
        return this.curveList.get(point).getControlPoint(0);
      }
    }
  }

  setControlPoint(point: number, val: vec3) {
    if (this.curveList.length === 0) {
      if (this.initPoint !== null && point === 0) {
        vec3.copy(this.initPoint, val);
      }
    } else {
      if (point < 0 || point >= this.getControlPointCount()) {
        return;
      } else {

        // grabs n points behind, or first
        const p_m3 = this.getControlPoint(Math.max(point - 3, 0));
        const p_m2 = this.getControlPoint(Math.max(point - 2, 0));
        const p_m1 = this.getControlPoint(Math.max(point - 1, 0));
        const p_0 = val;
        // grabs n points ahead, or last
        const p_1 = this.getControlPoint(Math.min(point + 1, this.getControlPointCount() - 1));
        const p_2 = this.getControlPoint(Math.min(point + 2, this.getControlPointCount() - 1));
        const p_3 = this.getControlPoint(Math.min(point + 3, this.getControlPointCount() - 1));

        if (point > 1) {
          // at least two points behind
          const backCurve = this.calculateSpline(p_m3, p_m2, p_m1, p_0);
          this.curveList.set(point - 2, backCurve);
        }

        if (point > 0) {
          // at least one point behind
          const endCurve = this.calculateSpline(p_m2, p_m1, p_0, p_1);
          this.curveList.set(point - 1, endCurve);
        }

        if (point < (this.getControlPointCount() - 1)) {
          // at least one point ahead
          const startCurve = this.calculateSpline(p_m1, p_0, p_1, p_2);
          this.curveList.set(point, startCurve);
        }

        if (point < (this.getControlPointCount() - 2)) {
          // at least two points ahead
          const frontCurve = this.calculateSpline(p_0, p_1, p_2, p_3);
          this.curveList.set(point + 1, frontCurve);
        }
      }
    }

    this.update();
  }

  getControlPointCount() {
    if (this.curveList.length === 0) {
      return (this.initPoint === null ? 0 : 1);
    }

    return this.curveList.length + 1;
  }

  get segmentCount() {
    return this.curveList.length;
  }

  getSegmentLength(ind: number) {
    if (ind < 0 || ind > (this.getControlPointCount() - 1)) {
      return 0;
    }

    return this.curveList.get(ind).arcLength;
  }

  // returns t on range (0, curvelist.length)
  private reparameterizeTime(time: number) {
    const desiredLength = (time / this.curveList.length) * this.arcLength;
    
    let cur = 0;
    let curLen = 0;
    for (; cur < this.curveList.length && desiredLength >= curLen; cur++) {
      curLen += this.curveList.get(cur).arcLength; 
    }

    if (cur === 0) {
      return 0;
    }

    // somewhere along curveList[cur - 1].
    cur--;
    const curve = this.curveList.get(cur);
    // roll curLen back a curve
    curLen -= curve.arcLength;
    const subT = (desiredLength - curLen) / curve.arcLength;

    return cur + subT;
  }

  private getCurveIndexFromT(t: number) {
    let sample = Math.floor(t);
    if (sample >= this.curveList.length) {
      sample--;
    }

    return sample;
  }

  private getPointNoLookup(time: number) {
    if (this.curveList.length === 0) {
      if (this.initPoint === null) {
        return null;
      }

      return Array.from(this.initPoint) as [number, number, number];
    }
    let t = Math.max(Math.min(time, this.curveList.length), 0);
    if (this.curveList.length === 0) {
      return (this.initPoint);
    }
    
    const curveIndex = this.getCurveIndexFromT(t);
    const curve = this.curveList.get(curveIndex);
    return curve.getPositionLut(t - curveIndex);
  }

  private getVelocityNoLookup(time: number) {
    // compare accuracy of this to simply connecting lines
    if (this.curveList.length === 0) {
      if (this.initPoint === null) {
        return null;
      }

      return [0, 0, 0] as vec3;
    }

    let t = Math.max(Math.min(time, this.curveList.length), 0);
    if (this.curveList.length === 0) {
      return [0, 0, 0] as vec3;
    }

    const curveIndex = this.getCurveIndexFromT(t);
    const curve = this.curveList.get(curveIndex);
    return curve.getVelocityLut(t - curveIndex);
  }

  private getNormalNoLookup(time: number, up?: vec3) {
    if (this.curveList.length === 0) {
      if (this.initPoint === null) {
        return null;
      }

      return [0, 0, 0] as vec3;
    }

    let t = Math.max(Math.min(time, this.curveList.length), 0);
    if (this.curveList.length === 0) {
      return [0, 0, 0] as vec3;
    }

    const index = this.getCurveIndexFromT(t);
    const curve = this.curveList.get(index);
    return curve.getNormalLut(t - Math.floor(t), up);
  }

  // p0, p1, p2, p3
  private calculateSpline(p0: vec3, p1: vec3, p2: vec3, p3: vec3) {
    const v0 = p1;
    const v1 = vec3.create();
    const v2 = vec3.create();
    const v3 = p2;

    vec3.copy(v1, p2);
    vec3.sub(v1, v1, p0);
    vec3.scale(v1, v1, 1 / 6);
    vec3.add(v1, v1, p1);

    vec3.copy(v2, p3);
    vec3.sub(v2, v2, p1);
    vec3.scale(v2, v2, -1 / 6);
    vec3.add(v2, v2, p2);

    return BezierCurve.fromVec3(v0, v1, v2, v3);
  }
}