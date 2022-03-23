import { vec3, ReadonlyVec3 } from "gl-matrix";

export interface ReadonlyLineSegment {
  start: ReadonlyVec3;
  end: ReadonlyVec3;
}

export interface LineSegment extends ReadonlyLineSegment {
  start: vec3;
  end: vec3;
};