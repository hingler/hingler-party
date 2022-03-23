import { CapsuleCollider } from "../client/ts/engine/collider/collidertype/CapsuleCollider"
import { ArmatureNode } from "../client/ts/engine/object/armature/ArmatureNode";
import { vec3, mat4 } from "gl-matrix";
import { Ray } from "../client/ts/engine/collider/Ray";
import { expect } from "chai";
import { LineSegment } from "../client/ts/engine/collider/LineSegment";

describe("CapsuleColliderTest", function() {
  it("Properly handles raycasts", function() {
    const capsule = new CapsuleCollider();
    capsule.radius = 1.5;
    capsule.length = 2;
    const mat = mat4.identity(mat4.create());

    const testRay = new Ray([0, 0, 4], [0, 0, -1]);

    // for collision updates: should we come up with a way to take partial steps??
    // do it later not right now
    for (let h = 0; h < Math.PI; h += 0.1) {
      for (let i = -8; i <= 8; i++) {
        mat4.identity(mat);
        mat4.translate(mat, mat, [i, 0, 0]);
        mat4.rotateX(mat, mat, h);
        mat4.rotateY(mat, mat, h)
        capsule.setTransform(mat);
        expect(capsule.raycast(testRay)).to.be[(Math.abs(i) < 2 ? "true" : "false")];
      }
    }
  });

  it("Finds correct closest-points",  function() {
    const capsule = new CapsuleCollider();
    capsule.radius = 1;
    capsule.length = 2;

    for (let i = -8; i < 8; i += 0.5) {
      for (let j = -8; j < 8; j += 0.5) {
        const point = [i, 0, j] as vec3;
        const pointCopy = vec3.copy(vec3.create(), point);
        const closestPoint = (vec3.length(point) > 1.0 ? vec3.normalize(pointCopy, pointCopy) : point);
        const actual = capsule.getClosestPoint(point);
        expect(vec3.equals(closestPoint, actual)).to.be.true;
      }
    }
  });

  it("Generates proper AABBs", function() {
    for (let r = 1; r < 2; r++) {
      for (let h = 1; h < 2; h++) {
        const capsule = new CapsuleCollider();
        capsule.length = h;
        capsule.radius = r;
        const mat = mat4.create();
        const point = vec3.create();

        for (let rotX = 0; rotX < Math.PI * 2; rotX += 2.0) {
          for (let rotY = 0; rotY < Math.PI * 2; rotY += 2.0) {
            for (let rotZ = 0; rotZ < Math.PI * 2; rotZ += 2.0) {
              mat4.identity(mat);
              mat4.rotateX(mat, mat, rotX);
              mat4.rotateY(mat, mat, rotY);
              mat4.rotateZ(mat, mat, rotZ);

              capsule.setTransform(mat);
              const box = capsule.getBoundingBox();
              for (let i = 0; i <= 1.0; i += 0.1) {
                for (let theta = 0; theta < Math.PI * 2; theta += 0.4) {
                  for (let phi = -Math.PI / 2 + 0.2; phi < Math.PI / 2; phi += 0.2) {
                    point[0] = Math.cos(phi) * Math.cos(theta) * r;
                    point[1] = Math.sin(phi) * r;
                    point[2] = Math.cos(phi) * Math.sin(theta) * r;
                    point[1] += (h * (i - 0.5));

                    // treat the capsule as a sphere sweep and select random points within its bounds
                    // verify that these points are inside the bounding box
                    vec3.transformMat4(point, point, mat);
                    expect(box.contains(point)).to.be.true;
                  }
                }
              }
            }
          }
        }
      }
    }
  })
})