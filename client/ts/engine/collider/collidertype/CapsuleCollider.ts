import { Collider } from "../Collider";
import { ReadonlyMat4, ReadonlyMat3, ReadonlyVec3, vec3 } from "gl-matrix";
import { ComponentType } from "../../component/ComponentType";
import { ColliderTransform } from "../ColliderTransform";
import { Ray } from "../Ray";
import { LineSegment } from "../LineSegment";
import { line_distToPoint, line_distToPointAsVector, line_projectOntoNormalPlane, line_projectOntoRay } from "../function/lineFunctional";
import { GenericBoundingBox } from "../GenericBoundingBox";

const CAPSULE_EPSILON = 0.00001;

export class CapsuleCollider implements Collider {
  private transform: ColliderTransform;

  // the length of the collider body -- extends (length / 2) in either direction along local y axis.
  length: number;

  // the radius of the collider -- distance from source line to detect collisions.
  radius: number;

  readonly type = ComponentType.CAPSULECOLLIDER;

  constructor() {
    this.transform = new ColliderTransform();
    this.length = 1;
    this.radius = 1;
  }

  getTransform() : ReadonlyMat4 {
    return this.transform.getTransform();
  }

  setTransform(m: ReadonlyMat4) {
    this.transform.setTransform(m);
  }

  getTransformInverse() : ReadonlyMat4 {
    return this.transform.getTransformInverse();
  }

  getTransformNormal(): ReadonlyMat3 {
      return this.transform.getTransformNormal();
  }

  getTransformInverseNormal() : ReadonlyMat3 {
    return this.transform.getTransformInverseNormal();
  }

  raycast(r: Ray) {
    const localRay = r.transformToColliderSpace(this);
    const localLine = this.getLocalColliderLine();

    const outputLine = {
      start: vec3.create(),
      end: vec3.create()
    } as LineSegment;

    line_projectOntoRay(outputLine, localLine, localRay);
    const startCast = vec3.create();
    const endCast = vec3.create();

    vec3.sub(startCast, outputLine.start, localRay.origin);
    vec3.sub(endCast, outputLine.end, localRay.origin);

    const startDist = vec3.dot(startCast, localRay.direction);
    const endDist = vec3.dot(endCast, localRay.direction);

    // caveat: point-lineseg?

    if (startDist > 0 || endDist > 0) {
      if (startDist < 0 || endDist < 0) {
        // shrink to only consider one side of ray
        const tFactor = -startDist / (endDist - startDist);
        const sign = (endDist > startDist ? 1 : -1);

        (sign > 0 ? localLine.start : localLine.end)[1] = ((tFactor * length) - length / 2);
      }

      // project line onto normal plane to get dist
      line_projectOntoNormalPlane(outputLine, localLine, localRay);
    } else {
      // use capsule line as is
      outputLine.start = localLine.start;
      outputLine.end = localLine.end;
    }

    return line_distToPoint(outputLine, localRay.origin) < this.radius;
  }

  getClosestPoint(point: ReadonlyVec3) {
    const res = vec3.copy(vec3.create(), point);

    // res contains our point in local space
    vec3.transformMat4(res, res, this.getTransformInverse());
    const len = this.length / 2;
    if (res[1] < -len) {
      res[1] += len;
    } else if (res[1] > len) {
      res[1] -= len;
    } else {
      res[1] = 0;
    }

    if (vec3.length(res) >= this.radius) {
      vec3.scale(res, vec3.normalize(res, res), this.radius);
    }

    // transform from local space back to world
    vec3.transformMat4(res, res, this.getTransform());

    return res;
  }

  getBoundingBox() {
    const colliderLocal = new GenericBoundingBox(-this.radius, this.radius, -this.length / 2 - this.radius, this.length / 2 + this.radius, -this.radius, this.radius);
    return colliderLocal.transform(this.getTransform());
  }

  private getLocalColliderLine() : LineSegment {
    // up and down on y axis
    return {
      start: [0, -(this.length / 2), 0],
      end: [0, this.length / 2, 0]
    };
  }
}