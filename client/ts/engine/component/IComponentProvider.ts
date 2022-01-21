import { ComponentType } from "./ComponentType";
import { IComponent } from "./IComponent";
import { AlphaTextureComponent } from "./impl/AlphaTextureComponent";
import { ModelComponent } from "./impl/ModelComponent";

export interface IComponentProvider {
  /**
   * Creates a component on `this`, and returns it.
   * @param type - the type of component we wish to create.
   */
  addComponent<T extends IComponent>(type: ComponentType) : T;
  getComponent<T extends IComponent>(type: ComponentType) : T;

  addComponent(type: ComponentType.MODEL)         : ModelComponent | null;
  addComponent(type: ComponentType.ALPHATEXTURE)  : AlphaTextureComponent | null;

  getComponent(type: ComponentType.MODEL)         : ModelComponent | null;
  getComponent(type: ComponentType.ALPHATEXTURE)  : AlphaTextureComponent | null;
}