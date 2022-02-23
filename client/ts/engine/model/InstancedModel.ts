import { ReadonlyMat3, ReadonlyMat4 } from "gl-matrix";
import { GLBufferReadOnly } from "../gl/internal/GLBuffer";
import { InstancedMaterial } from "../material/InstancedMaterial";
import { RenderContext } from "../render/RenderContext";
import { Model } from "./Model";

// this should not be our instanced model interface
// components which we return should wrap around this
// nvm we should return this
// create custom components which consume it, allowing for custom instanced models
// issue: using the same InstancedModel base for multiple things
// we wrap model already so i'll just return a fresh one each time
export interface InstancedModel extends Model {
  /**
   * queues up an additional instanced model draw.
   */
  drawInstanced() : void;

  /**
   * Queues up several instanced model draws at once.
   * @param count - number of draws to queue.
   */
  drawManyInstanced(count: number) : void;

  /**
   * Destroys all instances which are currently queued on this model.
   */
  clearInstances() : void;

  getBoundMaterial() : InstancedMaterial;

  // don't worry about matrices, etc. we can consider this to be the low level ver
  // set it up so that we can handle matrices

  /**
   * Appends information on an instance to the provided internal index.
   * @param index - the internal index which we are appending to.
   * @param data - the data which we are appending.
   * @param args - additional data values. Allows data to be provided either as a single array, or as multiple arguments.
   */
  appendInstanceData(index: number, data: number | Array<number> | Float32Array | ReadonlyMat3 | ReadonlyMat4, ...args: Array<number>) : void;

  // TODO: if it becomes necessary, add support for appending integer vs float data.
  //       i don't need it right now :)

  /**
   * Points the contents 
   * @param index - the internal index used to store this information.
   * @param attribLocation - the attribute index we are pointing from.
   * @param components - the number of compoenents per entry.
   * @param type - the type of data being stored.
   * @param normalize - true if data should be normalized, false otherwise.
   * @param stride - stride between consecutive elements.
   * @param offset - offset to first element.
   */
  instanceAttribPointer(index: number, attribLocation: number, components: number, type: number, normalize: boolean, stride: number, offset: number) : void;
  // todo: appending different types of data to our buffer???

  setInstancedMaterial(material: InstancedMaterial) : void;
  // circular dependency -- i think this is the only way to make it work how i want it to :(

  /**
   * Returns a read-only version of a particular buffer.
   * @param index - the index we are fetching
   * @returns the associated buffer, or null if one does not exist.
   */
  getReadOnlyBuffer(index: number) : GLBufferReadOnly;

  /**
   * Flushes this instance's contents, rendering them to the screen.
   * @param rc 
   */
  flush(rc: RenderContext) : void;
}