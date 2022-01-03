import { expect } from "chai";
import { vec3 } from "gl-matrix";
import { CatmullRomSpline } from "../client/ts/engine/spline/CatmullRomSpline"

describe("CatmullRomSplineTest", function() {
  it("Should instantiate properly", function() {
    const curve = new CatmullRomSpline();
    expect(curve.segmentCount).to.equal(0);
    expect(curve.getControlPointCount()).to.equal(0);
    curve.addPoint(1, 2, 3);
    const pos = curve.getPosition(0);
    expect(pos[0]).to.equal(1);
    expect(pos[1]).to.equal(2);
    expect(pos[2]).to.equal(3);
  });

  it("Should follow a path between two points", function() {
    const curve = new CatmullRomSpline();
    curve.addPoint(0, 0, 0);
    curve.addPoint(2, 2, 2);
    expect(curve.arcLength).to.approximately(Math.sqrt(12), 0.0001);

    for (let i = 0; i <= 10; i++) {
      const pt = curve.getPosition(i / 10);
      const min = Math.min(pt[0], pt[1], pt[2]);
      const max = Math.max(pt[0], pt[1], pt[2]);
      expect(min).to.approximately(max, 0.0001);
      // verify that reparameterization works
      expect(min).to.approximately(i / 5, 0.001);
    }
  });

  it("Should follow a path between multiple points!", function() {
    const curve = new CatmullRomSpline();
    for (let i = 0; i <= 10; i++) {
      curve.addPoint(2 * i, 2 * i, 2 * i);
    }

    expect(curve.arcLength).to.approximately(Math.sqrt(1200), 0.0001);

    for (let i = 0; i < 100; i++) {
      const pt = curve.getPosition(i / 100);
      const min = Math.min(pt[0], pt[1], pt[2]);
      const max = Math.max(pt[0], pt[1], pt[2]);
      expect(min).to.approximately(max, 0.0001);
      // verify that reparameterization works
      expect(min).to.approximately(i / 5, 0.001);
    }
  });

  it("Should respond to updated points!", function() {
    const curve = new CatmullRomSpline();
    for (let i = 0; i <= 10; i++) {
      curve.addPoint(2 * i, 2 * i, 2 * i);
    }

    // nudge the 5th control point along the line
    // should be colinear, so below constraint should still work fine
    curve.setControlPoint(4, vec3.fromValues(7, 7, 7));
    curve.setControlPoint(5, vec3.fromValues(8.6, 8.6, 8.6));

    for (let i = 0; i < 100; i++) {
      const pt = curve.getPosition(i / 100);
      const min = Math.min(pt[0], pt[1], pt[2]);
      const max = Math.max(pt[0], pt[1], pt[2]);
      expect(min).to.approximately(max, 0.0001);
      // verify that the cache update works
      expect(min).to.approximately(i / 5, 0.001);
    }

    // move second point
    curve.setControlPoint(1, vec3.fromValues(1.4, 1.4, 1.4));
    for (let i = 0; i < 100; i++) {
      const pt = curve.getPosition(i / 100);
      const min = Math.min(pt[0], pt[1], pt[2]);
      const max = Math.max(pt[0], pt[1], pt[2]);
      expect(min).to.approximately(max, 0.0001);
      // verify that the cache update works
      expect(min).to.approximately(i / 5, 0.001);
    }

    // move first point
    curve.setControlPoint(0, vec3.fromValues(1, 1, 1));
    for (let i = 0; i < 100; i++) {
      const pt = curve.getPosition(i / 100);
      const min = Math.min(pt[0], pt[1], pt[2]);
      const max = Math.max(pt[0], pt[1], pt[2]);
      expect(min).to.approximately(max, 0.0001);
      // verify that the cache update works
      expect(min).to.approximately(1 + i * (0.19), 0.001);
    }
  });

  it("Should handle the case where we pop elements off the front of the curve", function() {
    const curve = new CatmullRomSpline();
    for (let i = 0; i <= 10; i++) {
      curve.addPoint(i * 2, i * 2, i * 2);
    }

    const front = curve.popPoint();
    for (let i = 0; i < 3; i++) {
      expect(front[i]).to.equal(0);
    }

    for (let i = 0; i < 100; i++) {
      const pt = curve.getPosition(i / 100);
      const min = Math.min(pt[0], pt[1], pt[2]);
      const max = Math.max(pt[0], pt[1], pt[2]);
      expect(min).to.approximately(max, 0.0001);
      // verify that the cache update works
      expect(min).to.approximately(2 + i * (0.18), 0.001);
    }
  });
});