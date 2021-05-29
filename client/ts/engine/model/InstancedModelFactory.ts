import { ModelInstance } from "./ModelInstance";

/**
 * Model factory which generates additional model instances.
 */
export interface InstancedModelFactory<T extends ModelInstance> {
  /**
   * @returns an instance of this model.
   */
  getInstance() : T;
}