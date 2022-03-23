import { line_distToPoint, line_projectOntoNormalPlane, line_projectOntoRay } from "../client/ts/engine/collider/function/lineFunctional";
import { LineSegment } from "../client/ts/engine/collider/LineSegment";
import { Ray } from "../client/ts/engine/collider/Ray"
import { expect } from "chai";

import { vec3 } from "gl-matrix";

describe("LineTest", function() {
  // test projections
  it("Correctly projects lines", function() {
    const ray = new Ray([0, 0, 2], [0, 0, 1]);

    let line : LineSegment = {
      start: [ -2, -4, -6 ],
      end: [2, 4, 6]
    };

    line_projectOntoRay(line, line, ray);
    expect(vec3.equals(line.start, [0, 0, -6]));
    expect(vec3.equals(line.end, [0, 0, 6]));

    line = {
      start: [ -2, -4, -6 ],
      end: [2, 4, 6]
    };

    line_projectOntoNormalPlane(line, line, ray);
    expect(vec3.equals(line.start, [-2, -4, 2]));
    expect(vec3.equals(line.end, [2, 4, 2]));
  });

  it("Properly computes the distance between a line and a point", function() {
    // trivial
    const line : LineSegment = {
      start: [0, 0, 0],
      end: [0, 3, 0]
    };

    let point = vec3.fromValues(0, 0, 0);
    expect(line_distToPoint(line, point)).to.approximately(0.0, 0.0001);

    point = vec3.fromValues(0, 5, 0);
    expect(line_distToPoint(line, point)).to.approximately(2.0, 0.0001);

    point = vec3.fromValues(0, -2, 0);
    expect(line_distToPoint(line, point)).to.approximately(2.0, 0.0001);

    point = vec3.fromValues(6, 2, 8);
    expect(line_distToPoint(line, point)).to.approximately(10.0, 0.0001);

    line.start = [3, 0, 0];
    line.end = [4, 1, 0];

    point = vec3.fromValues(3.5, 0.5, -3.0);
    expect(line_distToPoint(line, point)).to.approximately(3.0, 0.0001);
  });
})