import { ComponentType } from "../ComponentType";
import { IComponent } from "../IComponent";
import { AlphaTextureComponent } from "../impl/AlphaTextureComponent";
import { ModelComponent } from "../impl/ModelComponent";

export class ComponentManager {
  static getComponent(type: ComponentType) : IComponent {
    switch (type) {
      case ComponentType.MODEL:
        return new ModelComponent();
      case ComponentType.ALPHATEXTURE:
        return new AlphaTextureComponent();
    }
  }
}

// makes sense to organize components here
// if we go full ECS, we'll store components here statically
// our context will fetch from this manager...
// and clear it when relevant