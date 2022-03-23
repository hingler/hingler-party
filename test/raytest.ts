import { Ray } from "../client/ts/engine/collider/Ray"
import { expect } from "chai";
import { vec3, mat4 } from "gl-matrix";
import { CapsuleCollider } from "../client/ts/engine/collider/collidertype/CapsuleCollider";

describe("RayTest", function() {
  it("Maintains normalized rays at a given position", function() {
    let r = new Ray([0, 0, 0], [5, 0, 0]);
    expect(vec3.equals(r.direction, [1, 0, 0]));

    r = new Ray([5, 6, 7], [2, 2, 2]);
    const len = Math.pow(1/3, 0.5);

    expect(vec3.equals(r.direction, [len, len, len]));
  });

  it("Transforms itself into the space of a collider", function() {
    const coll = new CapsuleCollider();
    
    const mat = mat4.identity(mat4.create());
    mat4.translate(mat, mat, [1, 1, 1]);
    mat4.scale(mat, mat, [0.5, 0.5, 0.5]);

    const ray = new Ray([0, 0, 0], [1, 0, 0]);
    coll.setTransform(mat);

    let rayNew = ray.transformToColliderSpace(coll);

    expect(vec3.equals(rayNew.origin, [-2, -2, -2])).to.be.true;
    expect(vec3.equals(rayNew.direction, [1, 0, 0])).to.be.true;

    mat4.identity(mat);
    mat4.translate(mat, mat, [1, 1, 1]);
    mat4.rotateZ(mat, mat, Math.PI / 2);
    // x axis should point up now

    coll.setTransform(mat);

    rayNew = ray.transformToColliderSpace(coll);

    console.log(rayNew);

    expect(vec3.equals(rayNew.origin, [-1, 1, -1])).to.be.true;
    expect(vec3.equals(rayNew.direction, [0, -1, 0])).to.be.true;

    mat4.scale(mat, mat, [0.5, 0.5, 2.0]);

    coll.setTransform(mat);
    rayNew = ray.transformToColliderSpace(coll);
    expect(vec3.equals(rayNew.origin, [-2, 2, -0.5])).to.be.true;
    expect(vec3.equals(rayNew.direction, [0, -1, 0])).to.be.true;
  })
})