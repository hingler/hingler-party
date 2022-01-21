import { Model } from "../../model/Model";
import { ComponentType } from "../ComponentType";
import { IComponent } from "../IComponent";

export class ModelComponent implements IComponent {
  readonly type = ComponentType.MODEL;
  model: Model;
}