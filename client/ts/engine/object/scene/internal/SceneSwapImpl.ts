import { Task } from "../../../../../../ts/util/task/Task";
import { GameContext } from "../../../GameContext";
import { Scene } from "../Scene";
import { SceneSwap } from "../SceneSwap";

export class SceneSwapImpl implements SceneSwap {
  private newctx: GameContext;
  private scene: Scene;
  private swapReady: boolean;
  /**
   * Creates a new SceneSwap.
   * @param newContext - the context which will eventually be associated with the associated scene.
   * @param scene - the associated scene.
   */
  constructor(newContext: GameContext, scene: Scene) {
    this.newctx = newContext;
    this.scene = scene;
    this.swapReady = false;
  }

  getFractionLoaded() {
    return this.newctx.getFileLoader().getFractionLoaded();
  }

  async swap() {
    await this.scene.waitUntilInitialized();
    this.swapReady = true;
  }

  // used by engine to swap in the new context
  canSwap() {
    return this.swapReady;
  }
}