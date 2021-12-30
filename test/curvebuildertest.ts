import { SegmentedCurveBuilder } from "@hingler-party/client/ts/engine/loaders/internal/SegmentedCurveBuilder";
import { expect } from "chai";
import { vec3 } from "gl-matrix";


describe("SegmentedCurveBuilder", function() {
  it("Should instantiate with no fuss", function() {
    const builder = new SegmentedCurveBuilder();
  });

  it("Should produce a simple line between two vertices", function() {
    const builder = new SegmentedCurveBuilder();
    builder.addVertex([0, 0, 0]);
    builder.addVertex([5, 5, 5]);
    builder.addSegment(0, 1);

    const curve = builder.convertToSegmentedCurve();
    
    for (let i = 0; i < curve.getControlPointCount(); i++) {
      const pt = curve.getControlPoint(i);
      for (let j = 0; j < 3; j++) {
        expect(pt[j]).to.approximately(i * 5, 0.0001);
      }
    }
  });

  it("Should create a complex, non-looping curve", function() {
    const builder = new SegmentedCurveBuilder();

    const vertices : Array<vec3> = [
      [0, 0, 0],
      [2, 4, 5],
      [1, 3, 6],
      [2, 6, 10]
    ];

    for (let vert of vertices) {
      builder.addVertex(vert);
    }

    builder.addSegment(0, 1);
    builder.addSegment(2, 3);
    builder.addSegment(1, 2);

    const res = builder.convertToSegmentedCurve();
    expect(res.getControlPointCount()).to.equal(4);

    for (let i = 0; i < 4; i++) {
      const expected = vertices[i];
      const actual = res.getControlPoint(i);

      for (let j = 0; j < 3; j++) {
        expect(actual[j]).to.equal(expected[j]);
      }
    }
  });

  it("Should create a complex, looping curve", function() {
    const builder = new SegmentedCurveBuilder();
    const vertices : Array<vec3> = [
      [0, 0, 0],
      [1, 4, 5],
      [2, 5, 7],
      [3, 6, 9],
      [1, 5, 2]
    ];

    for (let vert of vertices) {
      builder.addVertex(vert);
    }

    builder.addSegment(0, 1);
    builder.addSegment(1, 2);
    builder.addSegment(2, 3);
    builder.addSegment(3, 4);
    builder.addSegment(4, 0);

    const res = builder.convertToSegmentedCurve();
    expect(res.getControlPointCount()).to.equal(5);
    expect(res.loop).to.be.true;

    // our curve will begin at one of these points
    const zero = vertices[0];
    let offset = -1;
    for (let i = 0; i < 5; i++) {
      if (vec3.equals(zero, res.getControlPoint(i))) {
        offset = i;
        break;
      }
    }

    expect(offset).to.not.equal(-1);

    for (let i = 0; i < 5; i++) {
      const index = (i + offset) % 5;
      expect(vec3.equals(vertices[i], res.getControlPoint(index))).to.be.true;
    }
  })
});