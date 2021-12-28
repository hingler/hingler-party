// builds a segmented curve from a series of segment specifications and vertex specifications
// todo: how can we share a list of vertices between an OBJMap and this builder?
// we'll probably disambiguate with two different functions :3

import { vec3 } from "gl-matrix";
import { RingArray } from "../../../../../nekogirl-valhalla/array/RingArray";
import { SegmentedCurve } from "../../spline/SegmentedCurve";

/**
 * Builds a segmented curve based on inputs consistent with the OBJ spec.
 */
export class SegmentedCurveBuilder {
  // key: start index
  private mapAB: Map<number, number>;

  // key: end index
  private mapBA: Map<number, number>;

  private vertices: Array<vec3>;

  constructor() {
    this.mapAB = new Map();
    this.mapBA = new Map();
    this.vertices = [];
  }

  addVertex(vertex: vec3) {
    this.vertices.push(vertex);
  }

  addSegment(...segments: Array<number>) {
    for (let i = 1; i < segments.length; i++) {
      this.mapAB.set(segments[i - 1], segments[i]);
      this.mapBA.set(segments[i], segments[i - 1]);
    }  
  }

  convertToSegmentedCurve() {
    if (this.mapAB.size <= 0) {
      return null;
    }

    const itr = this.mapAB[Symbol.iterator]();
    const res = itr.next();

    if (res.done || !res.value) {
      return null;
    }

    const orderedSegments = new RingArray<[number, number]>(this.mapAB.size + 1);
    orderedSegments.push(res.value);
    let start = res.value as [number, number];
    let end = res.value as [number, number];
    
    let segmentCount = 1;

    // contains start index of segment before `start` if one exists
    let startTemp = this.mapBA.get(start[0]);
    while (startTemp !== undefined && segmentCount < this.mapAB.size) {
      // startTemp returned non-undefined, signifying there's an element before this one to fetch
      const newStart = [startTemp, start[0]] as [number, number];
      orderedSegments.enqueue(newStart);
      segmentCount++;
      start = newStart;
      startTemp = this.mapBA.get(start[0]);
    }

    let endTemp = this.mapAB.get(end[1]);
    while (endTemp !== undefined && segmentCount < this.mapAB.size) {
      const newEnd = [start[1], endTemp] as [number, number];
      orderedSegments.push(newEnd);
      segmentCount++;
      end = newEnd;
      endTemp = this.mapAB.get(end[1]);
    }

    // we now have an ordered list of segments
    // note: if we have a loop, we want to remove the last element and raise the loop flag.
    let vertexList : Array<vec3> = [];
    let loop : boolean = false;
    if (orderedSegments.get(0)[0] !== orderedSegments.get(orderedSegments.length - 1)[1]) {
      vertexList.push(this.vertices[orderedSegments.get(0)[0]]);
    } else {
      loop = true;
    }
    for (let i = 0; i < orderedSegments.length; i++) {
      vertexList.push(this.vertices[orderedSegments.get(i)[1]]);
    }

    const curve = new SegmentedCurve(vertexList);
    curve.loop = loop;

    return curve;
  }
}