import { vec2, vec3 } from "gl-matrix";
import { RingArray } from "../gl/internal/RingArray";
import { BezierCurve } from "./BezierCurve";
import { ParametricCurve } from "./ParametricCurve";

const STEPS_PER_CURVE = 200;
const T_STEP = 1 / Math.round(STEPS_PER_CURVE);

export class CatmullRomSpline implements ParametricCurve {
  // list of all contained curves
  private curveList: RingArray<BezierCurve>;

  // stores the estimated length of the spline at a given point in time
  // when polling for a time, t:
  // multiply length by t
  // interpolate by two closest points to target length, linearly, and return that
  // private, raw interpolation, and a public one which sugarcoats the results

  private initPoint: vec3;

  private lenMap: Array<number>;
  constructor() {
    this.curveList = new RingArray<BezierCurve>(256);
    this.lenMap = [];
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
        this.recalculateLengthCache();
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

      // recalculate our cache

      this.recalculateLengthCache(this.curveList.length - 2);
    }
    // if its the second point, create a curve from the first two points

    // otherwise:
    //  - pop the last curve in the curvelist
    //  - get the curve before that
    //  - recalculate the last curve, using our new point
    //  - push it back
    //  - calculate this new curve
    //  - push it on as well
    //  - repopulate our length map once more, starting from the first query on the spline we just pushed back
  }

  get pointLength() {
    return this.curveList.length;
  }

  get arcLength() {
    return this.lenMap[this.lenMap.length - 1];
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

  getNormal(time: number) {
    const timeMap = Math.max(Math.min(1, time), 0);

    let t = this.reparameterizeTime(timeMap * this.curveList.length);
    const norm = this.getNormalNoLookup(t);
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
      this.lenMap = this.lenMap.slice(STEPS_PER_CURVE);
      const offset = this.lenMap[0];
      for (let i = 0; i < this.lenMap.length; i++) {
        this.lenMap[i] -= offset;
      }
      
      this.recalculateLengthCache(0, 1);
      // for the rest of our curves, we use the same points, but we want to adjust their start points
    }
    
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

        // last step: update the cache!
        // side note: the whole circuit gets shorter!
        // optimization: grab the last affected point by a recache, compare its old value
        // to the value after the recache

        // offset every successive point by that delta!
        this.recalculateLengthCache();
      }
    }
  }

  getControlPointCount() {
    if (this.curveList.length === 0) {
      return (this.initPoint === null ? 0 : 1);
    }

    return this.curveList.length + 1;
  }

  private reparameterizeTime(time: number) {
    let t = Math.max(Math.min(this.curveList.length, time), 0);
    const curveSize = this.lenMap[this.lenMap.length - 1];

    // figure out the estimated length of our curve
    let lenTarget = ((t / this.curveList.length) * curveSize);
    let cur = 0;

    // find the first point in our length cache greater than target
    for (; cur < this.lenMap.length && this.lenMap[cur] <= lenTarget; cur++);

    if (cur === this.lenMap.length) {
      // t end
      return this.curveList.length;
    }
    
    const tLow = this.lenMap[(cur - 1)];
    const tHigh = this.lenMap[cur];
    // inverse lerp to get t from low to high, multiply by step size and add
    return ((cur - 1) * T_STEP) + ((lenTarget - tLow) / (tHigh - tLow)) * T_STEP;
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
    
    const curveIndex = Math.min(Math.floor(t), this.curveList.length - 1);
    const curve = this.curveList.get(curveIndex);
    return curve.getPosition(t - curveIndex);
  }

  private getVelocityNoLookup(time: number) {
    // compare accuracy of this to simply connecting lines
    if (this.curveList.length === 0) {
      if (this.initPoint === null) {
        return null;
      }

      return [0, 0, 0] as vec3;
    }

    let t = Math.max(Math.min(time, 1), 0);
    t *= this.curveList.length;
    const curve = this.curveList.get(Math.floor(t));
    return curve.getVelocity(t - Math.floor(t));
  }

  private getNormalNoLookup(time: number) {
    if (this.curveList.length === 0) {
      if (this.initPoint === null) {
        return null;
      }

      return [0, 0, 0] as vec3;
    }

    let t = Math.max(Math.min(time, 1), 0);
    t *= this.curveList.length;
    const curve = this.curveList.get(Math.floor(t));
    return curve.getNormal(t - Math.floor(t));
  }

  // recalculates length cache upto and including end
  private recalculateLengthCache(start?: number, end?: number) {
    // purge all t values equal to, or greater than, start point
    let t = Math.max(Math.min(this.curveList.length, (start !== undefined ? start : 0)), 0);
    // avoid rounding issues
    const endT = (end !== undefined ? end : this.curveList.length) - (T_STEP / 2);
    let ind = Math.round(t / T_STEP);
    let startVec: vec3 = this.getPointNoLookup((ind - 1) * T_STEP);
    while (t <= endT) {
      t = (ind * T_STEP);
      const last = (ind > 0 ? this.lenMap[ind - 1] : 0);
      const end = this.getPointNoLookup(t);
      const endDiff = vec3.fromValues(end[0], end[1], end[2]);
      // TODO: halve computations :D
      // end = end - start
      vec3.sub(endDiff, end, startVec);
      const dist = vec3.length(endDiff);
      this.lenMap[ind++] = dist + last;
      startVec = end;
    }
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