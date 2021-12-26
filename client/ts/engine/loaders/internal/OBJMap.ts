import { vec3 } from "gl-matrix";

// associate vertex data with a unique index
// we'll just store texture and normal :(


// (sidenote: would be nice to port over mikktspace)
//
// what do we store???
// just store pos, norm, tex indices here
// map will store unique pairings
// and then we'll use an iterator to return unique pairings
// each vnt triplet shoould map to a number

// accept vertices, normals, and texcoords as input (functions for each)
// accept faces as input (3+ vnt indices)
// convert vnt inputs to unique indices
// store unique index groups in our converted indices
// expose an iterator which returns all vnt combos
// expose an iterator which returns all faces (as tris? or should we just leave them as inputted)
// assume vertices in ccw order

export class OBJMap {
  // if performance is a concern: create an autosizing buffer class
  // integrate w glbuffer to avoid redundancy :(
  private positions: Array<vec3>;
  private normals: Array<vec3>;
  private texcoords: Array<vec3>;

  
}
