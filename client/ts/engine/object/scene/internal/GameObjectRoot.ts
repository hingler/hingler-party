import { GameContext } from "../../../GameContext";
import { RenderContext } from "../../../render/RenderContext";
import { GameObject } from "../../game/GameObject";

// special type of game object which exposes update funcs
export class GameObjectRoot extends GameObject {

  constructor(ctx: GameContext) {
    super(ctx);
  }

  renderChildren(rc: RenderContext) {
    this.renderfunc(rc);
  }

  callbackChildren(cb: (child: GameObject) => void) {
    this.childcallback(cb);
  }

  updateChildren() {
    this.updatefunc();
  }
}