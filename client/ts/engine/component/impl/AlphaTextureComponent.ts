import { Texture } from "../../gl/Texture";
import { ComponentType } from "../ComponentType";
import { IComponent } from "../IComponent";
import { TransparencyMode } from "./alphatex/TransparencyMode";

export class AlphaTextureComponent implements IComponent {
  readonly type = ComponentType.ALPHATEXTURE;
  tex: Texture;
  transparencyMode: TransparencyMode;
}