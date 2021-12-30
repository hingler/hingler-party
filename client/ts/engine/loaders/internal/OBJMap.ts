import { vec2, vec3, vec4 } from "gl-matrix";
import { Hashable } from "nekogirl-valhalla";
import { HashMap } from "@nekogirl-valhalla/map/HashMap";
import { GameContext } from "../../GameContext";
import { GLAttributeImpl } from "../../gl/internal/GLAttributeImpl";
import { GLBufferImpl } from "../../gl/internal/GLBufferImpl";
import { GLIndexImpl } from "../../gl/internal/GLIndexImpl";
import { ModelInstance } from "./ModelImpl";


const MAX_INT_32 = Math.pow(2, 32) - 1;

const PLACEHOLDER = [0, 0, 0, 1];

class vnt_triplet implements Hashable<vnt_triplet> {
  vertex_index: number;
  normal_index: number;
  texcoord_index: number;

  hash() {
    // ideally, we can create a broad range of noise with relatively small values
    let res = this.vertex_index;
    res *= this.normal_index;
    res %= MAX_INT_32;
    res *= this.texcoord_index;
    res %= MAX_INT_32;

    return res;
  }

  equals<T extends Hashable<T>>(other: Hashable<T>) {
    if (other instanceof vnt_triplet) {
      return this.equals_vnt(other);
    }

    return false;
  }

  copy() {
    let res = new vnt_triplet();
    res.vertex_index = this.vertex_index;
    res.normal_index = this.normal_index;
    res.texcoord_index = this.texcoord_index;

    return res;
  }

  private equals_vnt(other: vnt_triplet) {
    let res = true;
    res &&= (this.vertex_index === other.vertex_index);
    res &&= (this.normal_index === other.normal_index);
    res &&= (this.texcoord_index === other.texcoord_index);
    return res;
  }
}

export class OBJMap {
  // if performance is a concern: create an autosizing buffer class
  // integrate w glbuffer to avoid redundancy :(
  private positions: Array<vec4>;
  private normals: Array<vec3>;
  private texcoords: Array<vec2>;

  private vntMap: HashMap<vnt_triplet, number>;
  private indices: Array<number>;

  private indexCount: number;

  private ctx: GameContext;

  constructor(ctx: GameContext) {
    // it would be good to have a (0, 0, 0) default
    // use a negative index to encode that one, and we'll substitute it when we go to render
    this.positions = [];
    this.normals = [];
    this.texcoords = [];

    this.vntMap = new HashMap();
    this.indices = [];

    this.indexCount = 0;

    this.ctx = ctx;
  }

  /**
   * Adds a position to this map.
   * @param pos - vec4 specifying position.
   */
  addPosition(pos: vec4) {
    this.positions.push(pos);
  }

  /**
   * Adds a normal to this map.
   * @param norm - vec3 specifying a normal.
   */
  addNormal(norm: vec3) {
    this.normals.push(norm);
  }

  /**
   * Adds a texcoord to this map.
   * @param tex - vec2 specifying a texcoord.
   */
  addTexcoord(tex: vec2) {
    this.texcoords.push(tex);
  }

  /**
   * Adds a face to this OBJMap.
   * @param vertices - An array of OBJ vertex specifications, order preserved.
   */
  addFace(vertices: Array<string>) {
    const indexArray : Array<number> = [];
    if (vertices.length > 4) {
      // can't handle!
      console.warn("OBJMap encountered N-gon. ignoring...");
      return null;
    }

    for (let vertex of vertices) {
      const triplet : vnt_triplet = new vnt_triplet();
      const split = vertex.split("/");
      triplet.vertex_index = Number.parseInt(split[0]);
      if (split.length > 1) {
        triplet.texcoord_index = (split[1].length > 0 ? Number.parseInt(split[1]) : -1);
      }

      if (split.length > 2) {
        triplet.normal_index = (split[2].length > 0 ? Number.parseInt(split[2]) : -1);
      }

      indexArray.push(this.addVertexTriplet(triplet));
    }

    if (indexArray.length === 4) {
      this.indices.push(indexArray[0], indexArray[1], indexArray[2], indexArray[0], indexArray[2], indexArray[3]);
    } else {
      this.indices.push(...indexArray);
    }
  }

  convertVertexDataToModelInstance() : ModelInstance {
    const geometryBuffer = new GLBufferImpl(this.ctx);
    const indexBuffer = new GLBufferImpl(this.ctx);

    const indices = indexBuffer.getRegionAsUint16Array(0, this.indices.length);
    // 4 position, 3 normal, 2 tex
    const vertices = geometryBuffer.getRegionAsFloat32Array(0, this.vntMap.size * 9);

    // for each unique triplet in our map:
    // find its offset based on its assigned index
    // write the data it references to its specified location

    let position: vec4;
    let texcoord: vec2;
    let normal  : vec3;

    let vertexCount = 0;
    let indexCount = 0;

    for (let triplet of this.vntMap) {
      const t = triplet.key;
      const index = triplet.value;

      position = this.positions[t.vertex_index - 1];
      texcoord = this.texcoords[t.texcoord_index - 1];
      normal = this.normals[t.normal_index - 1];

      if (!position) {
        position = PLACEHOLDER as vec4;
      }

      if (!texcoord) {
        texcoord = PLACEHOLDER as vec2;
      }

      if (!normal) {
        normal = PLACEHOLDER as vec3;
      }

      const iOff = index * 9;

      vertices[iOff] = position[0];
      vertices[iOff + 1] = position[1];
      vertices[iOff + 2] = position[2];
      vertices[iOff + 3] = position[3];
      vertices[iOff + 4] = normal[0];
      vertices[iOff + 5] = normal[1];
      vertices[iOff + 6] = normal[2];
      vertices[iOff + 7] = texcoord[0];
      vertices[iOff + 8] = texcoord[1];
      // this should be redundant
      vertexCount++;
    }

    for (let i = 0; i < this.indices.length; i++) {
      indices[i] = this.indices[i];
    }

    const gl = this.ctx.getGLContext();

    const BYTE_STRIDE = 36;
    const posAttribute = GLAttributeImpl.createFromValues(geometryBuffer, 4, gl.FLOAT, 4, 0, BYTE_STRIDE);
    const normAttribute = GLAttributeImpl.createFromValues(geometryBuffer, 3, gl.FLOAT, 3, 16, BYTE_STRIDE);
    const texAttribute = GLAttributeImpl.createFromValues(geometryBuffer, 2, gl.FLOAT, 2, 28, BYTE_STRIDE);
    const index = GLIndexImpl.createFromValues(indexBuffer, gl.UNSIGNED_SHORT, this.indices.length, 0);

    const res : ModelInstance = {
      positions: posAttribute,
      normals: normAttribute,
      texcoords: texAttribute,
      indices: index
    };

    return res;
  }

  private addVertexTriplet(vert: vnt_triplet) {
    const res = this.vntMap.get(vert);
    if (res !== null) {
      return res;
    }

    this.vntMap.put(vert, this.indexCount);
    return this.indexCount++;
  }
}
