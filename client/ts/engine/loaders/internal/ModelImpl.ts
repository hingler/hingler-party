import { GLAttribute } from "../../gl/GLAttribute";
import { GLIndex } from "../../gl/GLIndex";
import { AttributeType, Model, Triangle, Vertex } from "../../model/Model";

// instanced pathway: draw all instances in one go?
// if that's the case, then tiling gets a bit weird

// instanced rendering is not compatible with our current workflow, and cannot be used
// in place of regular models (limitations on instancing + materials)

// as a workaround, in order to support instancing we'll need a subclass of materials to support it
// we'll need a completely separate workflow for instanced rendering, probably involving
// queueing up "draws" by uploading attributes, etc. before finally "flush"ing those attributes
// in one go

// we'd probably construct the instanced model in a super class and manage it from there.
// we'd have to set the model's material, instead of a material consuming a model.
// and remember to use gl.DYNAMIC_DRAW.

// for now though: use regular models :-)

// TODO: reclassify as primitive -- point=1, line=2, tri=3
class TriangleIterator implements Iterator<Triangle> {
  model: ModelImpl;
  offset: number;
  instance: number;

  constructor(model: ModelImpl) {
    this.model = model;
    this.offset = 0;
    this.instance = 0;
  }
  next() {
    // if we are not at the end of the index list: return the next index
    // otherwise, go to the next instance
    if (this.instance >= this.model.instances.length) {
      return {value: null, done: true};
    }

    if (this.offset >= this.model.instances[this.instance].indices.count) {
      this.instance++;
      this.offset = 0;

      // :(
      if (this.instance >= this.model.instances.length) {
        return {value: null, done: true};
      }
    }

    let verts = [];
    let inst = this.model.instances[this.instance];

    // assuming tris
    for (let i = 0; i < 3; i++) {
      let ind = inst.indices.getIndex(this.offset++);

      let pos = (inst.positions ? inst.positions.get(ind) : null);
      let norm = (inst.normals ? inst.normals.get(ind) : null);
      let tex = (inst.texcoords ? inst.texcoords.get(ind) : null);
      let joint = (inst.joints ? [] : null);
      let weight = (inst.weights ? [] : null);

      if (inst.joints) {
        for (let j = 0; j < inst.joints.length; j++) {
          joint.push(inst.joints[j].get(ind));
        }
      }

      if (inst.weights) {
        for (let j = 0; j < inst.weights.length; j++) {
          weight.push(inst.weights[j].get(ind));
        }
      }

      let vert : Vertex = {
        position: pos,
        normal: norm,
        texcoord: tex,
        joints: joint,
        weights: weight
      };

      verts.push(vert);
    }

    // all good
    let res = {
      vertices: verts
    };

    return {value: res, done: ((this.instance === this.model.instances.length - 1) && this.offset >= this.model.instances[this.instance].indices.count)};
  }
}

/**
 * Represents a single instance which may comprise a model.
 */
export interface ModelInstance {
  positions: GLAttribute;
  normals?: GLAttribute;
  texcoords?: GLAttribute;
  tangents?: GLAttribute;
  joints?: Array<GLAttribute>;
  weights?: Array<GLAttribute>;
  indices: GLIndex;
}

export class ModelImpl extends Model {
  readonly instances: Array<ModelInstance>;

  posLocation: number;
  normLocation: number;
  texLocation: number;
  tangentLocation: number;
  jointLocation: Array<number>;
  weightLocation: Array<number>;
  
  constructor(instances: Array<ModelInstance>) {
    super();
    this.instances = instances;
    this.posLocation = -1;
    this.normLocation = -1;
    this.texLocation = -1;
    this.tangentLocation = -1;
    this.jointLocation = null;
    this.weightLocation = null;
  }

  [Symbol.iterator]() : Iterator<Triangle> {
    return new TriangleIterator(this);
  }

  bindAttribute(at: AttributeType, ...location: Array<number>) {
    switch (at) {
      case AttributeType.POSITION:
        this.posLocation = location[0];
        break;
      case AttributeType.NORMAL:
        this.normLocation = location[0];
        break;
      case AttributeType.TEXCOORD:
        this.texLocation = location[0];
        break;
      case AttributeType.TANGENT:
        this.tangentLocation = location[0];
        break;
      case AttributeType.JOINT:
        this.jointLocation = location;
        break;
      case AttributeType.WEIGHT:
        this.weightLocation = location;
        break;
      default:
        console.warn("noop: bindattribute received unhandled attribute type");
    }
  }

  private pointToAttributes(inst: ModelInstance) {
    if (this.posLocation >= 0) {
      inst.positions.pointToAttribute(this.posLocation);
    } else {
      const err = "position not bound on draw :)";
      console.error(err);
      throw Error(err);
    }

    if (inst.normals && this.normLocation >= 0) {
      inst.normals.pointToAttribute(this.normLocation);
    }

    if (inst.texcoords && this.texLocation >= 0) {
      inst.texcoords.pointToAttribute(this.texLocation);
    }

    if (inst.tangents && this.tangentLocation >= 0) {
      inst.tangents.pointToAttribute(this.tangentLocation);
    }

    for (let i = 0; inst.joints && this.jointLocation && i < this.jointLocation.length && i < inst.joints.length; i++) {
      inst.joints[i].pointToAttribute(this.jointLocation[i]);
    }


    for (let i = 0; inst.weights && this.weightLocation && i < this.weightLocation.length && i < inst.weights.length; i++) {
      inst.weights[i].pointToAttribute(this.weightLocation[i]);
    }
  }

  private disableIndices(inst: ModelInstance) {
    inst.positions.disableAttribute();
    if (inst.normals) {
      inst.normals.disableAttribute();
    }

    if (inst.texcoords) {
      inst.texcoords.disableAttribute();
    }

    if (inst.tangents) {
      inst.tangents.disableAttribute();
    }

    if (inst.joints) {
      for (let joint of inst.joints) {
        joint.disableAttribute();
      }
    }

    if (inst.weights) {
      for (let weight of inst.weights) {
        weight.disableAttribute();
      }
    }
  }

  private resetAttributes() {
    this.posLocation = -1;
    this.normLocation = -1;
    this.texLocation = -1;
    this.tangentLocation = -1;
    this.jointLocation = [];
    this.weightLocation = [];
  }

  drawInstanced(count: number) {
    // attributes are already bound
    // just do the same thing
    for (let inst of this.instances) {
      this.pointToAttributes(inst);
      inst.indices.drawInstanced(count);
      this.disableIndices(inst);
    }

    // disable only on last, we're enabling the same attribs each time.
    this.resetAttributes();
  }

  draw() {
    for (let inst of this.instances) {
      this.pointToAttributes(inst);
      inst.indices.draw();
      this.disableIndices(inst);
    }
  }
}
