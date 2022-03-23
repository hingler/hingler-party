import { GenericBoundingBox } from "../client/ts/engine/collider/GenericBoundingBox"
import { vec3 } from "gl-matrix";
import { expect } from "chai";

describe("BoundingBoxTest", function() {
  it("Correctly reports points which it encompasses", function() {
    const boundingBox = new GenericBoundingBox(-4, 4, -4, 4, -4, 4);

    for (let i = -7.5; i <= 7.5; i += 1.0) {
      for (let j = -7.5; j <= 7.5; j += 1.0) {
        for (let k = -7.5; k <= 7.5; k += 1.0) {
          const point = [i, j, k] as number[] as vec3;
          expect(boundingBox.contains(point)).to.be[(i < 4 && i > -4 && j < 4 && j > -4 && k < 4 && k > -4) ? "true" : "false"];
        }
      }
    }
  })
})