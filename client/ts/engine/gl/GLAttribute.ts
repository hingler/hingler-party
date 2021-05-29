import { vec2 } from "gl-matrix";
import { Accessor, BufferView } from "../loaders/internal/gltfTypes";

export interface GLAttribute {

  // number of components in each entry (scalar = 1, vec2 = 2, etc.)
  readonly comps: number;
  // byte size of each component
  readonly componentByteSize: number;
  // number of components in all
  readonly count: number;

  /**
   * Binds this attribute to a particular vertex index.
   * @param location - the location we are binding to.
   */
  pointToAttribute(location: number) : void;

  /**
   * Disables the attribute.
   */
  disableAttribute() : void;

  [Symbol.iterator]() : Iterator<Float32Array>;

  /**
   * @param index index of this attribute we wish to fetch.
   * @returns the attribute stored at the desired index.
   */
  get(index: number) : Float32Array;
}