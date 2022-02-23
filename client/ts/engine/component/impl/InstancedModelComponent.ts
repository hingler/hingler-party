import { InstancedModel } from "../../model/InstancedModel";
import { ComponentType } from "../ComponentType";
import { IComponent } from "../IComponent";

export class InstancedModelComponent implements IComponent {
  readonly type = ComponentType.INSTANCEDMODEL;
  // array makes sense, for a component
  model: Array<InstancedModel>;
}