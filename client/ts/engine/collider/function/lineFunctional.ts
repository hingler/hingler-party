/**
 * Series of functional classes for lines
 */

import { LineSegment, ReadonlyLineSegment } from "../LineSegment";
import { Ray } from "../Ray";

import { vec3, ReadonlyVec3 } from "gl-matrix";

// workspace for vector ops
// calls to other line funcs will invalidate this data
const work1 = vec3.create();
const work2 = vec3.create();

/**
 * Modifies a line segment in place
 * @param out - output line
 * @param l - input line
 * @param r - ray to projeect the line onto.
 */
export function line_projectOntoRay(out: LineSegment, l: ReadonlyLineSegment, r: Ray) : LineSegment {
  // l -> ray space
  vec3.sub(out.start, l.start, r.origin);
  vec3.sub(out.end, l.end, r.origin);
  
  // dot prod to figure out dist along ray
  vec3.scale(out.start, r.direction, vec3.dot(out.start, r.direction));
  vec3.scale(out.end, r.direction, vec3.dot(out.end, r.direction));

  // back to global space
  vec3.add(out.start, out.start, r.origin);
  vec3.add(out.end, out.end, r.origin);

  return out;
}

export function line_projectOntoNormalPlane(out: LineSegment, l: ReadonlyLineSegment, r: Ray) : LineSegment {
  line_projectOntoRay(out, l, r);

  // out is in global space, along the ray
  vec3.sub(out.start, l.start, out.start);
  vec3.sub(out.end, l.end, out.end);

  vec3.add(out.start, out.start, r.origin);
  vec3.add(out.end, out.end, r.origin);

  return out;
}

function line_distToPointAsWorkVector(l: ReadonlyLineSegment, p: ReadonlyVec3) {
  vec3.sub(work1, l.end, l.start);
  const lineLen = vec3.len(work1);
  vec3.normalize(work1, work1);
  // work2 contains vector from start to p
  vec3.sub(work2, p, l.start);
  const dotPos = vec3.dot(work2, work1);
  if (dotPos < 0) {
    vec3.sub(work1, p, l.start);
  } else if (dotPos > lineLen) {
    vec3.sub(work1, p, l.end);
  } else {
    // work1 is our ray -- scale it by the len of the projection and subtract that from work2
    // to get perpendicular component of dist from start
    vec3.sub(work1, work2, vec3.scale(work1, work1, dotPos));
  }

  return work1;
}

export function line_distToPointAsVector(l: ReadonlyLineSegment, p: ReadonlyVec3) : vec3 {
  // if the cross product between the line and the vec is less than an epsilon: we're on the line
  // - project point onto line segment
  return vec3.copy(vec3.create(), line_distToPointAsWorkVector(l, p));
}

export function line_distToPoint(l: ReadonlyLineSegment, p: ReadonlyVec3) : number {
  return vec3.len(line_distToPointAsWorkVector(l, p));
}