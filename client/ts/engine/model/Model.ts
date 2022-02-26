import { ArmatureManager } from "../object/armature/ArmatureManager";
import { AttributeType } from "nekogirl-valhalla/model/AttributeType";

// triangle will bundle our attribs up into something like this
export interface Vertex {
  readonly position: Float32Array;
  readonly normal?: Float32Array;
  readonly texcoord?: Float32Array;
  readonly joints?: Array<Float32Array>;
  readonly weights?: Array<Float32Array>;
}

export interface Triangle {
  readonly vertices: Array<Vertex>;
}

/**
 * Model which does not enable binding of attributes. Draw only.
 */
export interface DrawOnlyModel {
  draw() : void;
}

/**
 * Represents a 3D model.
 * TODO: Create a version of Model which acts like a GLTF model.
 * Probably wrap this class and not import -- draw will use GLTF material w params.
 */
export abstract class Model implements DrawOnlyModel {

  abstract readonly name: string;

  /**
   * Binds an attribute to a specific location.
   * @param at - The attribute type we are binding.
   * @param location - the vertex index at which this attribute should be bound.
   *                   
   *                   In cases such as joints and weights where multiple attributes may be specified, these
   *                     can be provided via an array.
   */
  abstract bindAttribute(at: AttributeType, ...location: Array<number>) : void;

  abstract draw() : void;

  /**
   * @returns The armature manager associated with this model, if one exists.
   */
  abstract getArmature() : ArmatureManager;

  /**
   * Draws a specified number of instances.
   * InstancedModel is preferred for setting up instance attributes.
   * @param count - number of instances to draw.
   */
  abstract drawInstanced(count: number) : void;
}
