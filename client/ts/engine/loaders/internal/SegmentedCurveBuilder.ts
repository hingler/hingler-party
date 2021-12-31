// builds a segmented curve from a series of segment specifications and vertex specifications
// todo: how can we share a list of vertices between an OBJMap and this builder?
// we'll probably disambiguate with two different functions :3

import { ReadonlyVec3, vec3 } from "gl-matrix";
import { SegmentedCurve } from "../../spline/SegmentedCurve";
import { RingArray } from "@nekogirl-valhalla/array/RingArray";

/**
 * Builds a segmented curve based on inputs consistent with the OBJ spec.
 */
export class SegmentedCurveBuilder {

  private connections: Map<number, Array<number>>;

  private vertices: Array<ReadonlyVec3>;

  constructor() {
    this.vertices = [];

    this.connections = new Map();
  }

  private addConnection(start: number, end: number) {
    if (!this.connections.has(start)) {
      this.connections.set(start, []);
    }

    this.connections.get(start).push(end);
  }

  addVertex(vertex: ReadonlyVec3) {
    this.vertices.push(vertex);
  }

  addSegment(...segments: ReadonlyArray<number>) {
    // i think the loop case is implicitly handled
    // if we attempt to loop back, we'll obliterate a vertex?
    // but then i think i should handle that :(
    for (let i = 1; i < segments.length; i++) {
      this.addConnection(segments[i - 1], segments[i]);
      this.addConnection(segments[i], segments[i - 1]);
    }  
  }

  private recurse_buildCurve(visits: Set<number>, output: RingArray<[number, number]>, parent: number, ahead: boolean) {
    // parent represents the vertex we intend to branch from
    // if parent is ahead of our starting segment, 
    console.log(parent);
    console.log(this.connections.get(parent));
    visits.add(parent);
    const candidates = this.connections.get(parent);
    // figure out how to build multiple curves and splice them together
    // at these break points, we should generate a new RingArray and toss things into it
    // with multiple curves, we can capture break points along lines
    for (let vert of candidates) {
      if (!visits.has(vert)) {
        if (ahead) {
          output.push([parent, vert]);
        } else {
          output.enqueue([vert, parent]);
        }

        this.recurse_buildCurve(visits, output, vert, ahead);
      }
    }
  }

  convertToSegmentedCurve() {
    if (this.connections.size <= 0) {
      return null;
    }

    console.log(this.connections);

    const itr = this.connections[Symbol.iterator]() as Iterator<[number, Array<number>]>;
    const inst = itr.next() as IteratorResult<[number, Array<number>], [number, Array<number>]>;

    const res = [inst.value[0], inst.value[1][0]] as [number, number];

    const orderedSegments = new RingArray<[number, number]>(this.connections.size * 2);
    orderedSegments.push(res);

    let visitedPoints = new Set<number>();
    visitedPoints.add(res[0]);
    visitedPoints.add(res[1]);

    this.recurse_buildCurve(visitedPoints, orderedSegments, res[1], true);
    this.recurse_buildCurve(visitedPoints, orderedSegments, res[0], false);

    // we now have an ordered list of segments
    // note: if we have a loop, we want to remove the last element and raise the loop flag.
    let vertexList : Array<ReadonlyVec3> = [];
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